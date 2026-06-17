import {
  Component,
  inject,
  signal,
  computed,
  input,
  output,
  ViewChild,
  ElementRef,
  PLATFORM_ID,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize, from } from 'rxjs';
import { Chat, Mensaje } from '../../../../core/models/chat.model';
import { ChatService } from '../../../../core/services/chat.service';
import { ChatWsService } from '../../../../core/services/chat-ws.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { FlagService } from '../../../../core/services/flag.service';
import { MotivoDenuncia, TipoObjetivo } from '../../../../core/models/flag.model';

import { ChatReportPreviewComponent } from './components/report-preview/report-preview.component';
import { ChatInputComponent } from './components/chat-input/chat-input.component';
import { ChatMessagesComponent } from './components/message-list/message-list.component';
import { FlagModalComponent } from '../../../../shared/components/flag-modal/flag-modal';
import { OptionsDropdownComponent, DropdownOption } from '../../../../shared/components/options-dropdown/options-dropdown';
import { ChatStore } from '../../services/chat.store';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  providers: [ChatStore],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ChatReportPreviewComponent,
    ChatInputComponent,
    ChatMessagesComponent,
    FlagModalComponent,
    OptionsDropdownComponent,
  ],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWindowComponent {
  // ─── Inyección de Dependencias ──────────────────────────────────────────
  protected store = inject(ChatStore);
  private chatService = inject(ChatService);
  private chatWsService = inject(ChatWsService);
  private authService = inject(AuthService);
  private flagService = inject(FlagService);

  // ─── Inputs y Outputs ────────────────────────────────────────────────────
  chat = input<Chat | null>(null);
  closed = output<void>();

  @ViewChild(ChatMessagesComponent) messageList!: ChatMessagesComponent;
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  // ─── Estado UI Local ──────────────────────────────────────────────────────
  isPreviewModalOpen = signal(false);
  selectedReportMsg = signal<Mensaje | null>(null);

  // Estados para denunciar
  flagModalOpen = signal(false);
  flagTarget = signal<{ type: string; id: string; label: string } | null>(null);
  flagMotivo = signal<MotivoDenuncia>('spam');
  flagDescripcion = signal('');
  isFlagging = signal(false);

  menuItems: DropdownOption[] = [
    { label: 'Denunciar chat', icon: 'flag', value: 'flag', danger: true }
  ];

  myId = computed(() => this.authService.usuario()?.id_usuario ?? '');
  hasChatRestriction = computed(() => this.authService.hasRestriccion('chat'));
  chatRestriction = computed(() => {
    // Buscar la restricción de chat activa si existe
    const restricciones = this.authService.usuario()?.restricciones ?? [];
    const ahora = new Date();
    return restricciones.find(r => r.tipo === 'chat' && r.activo !== false && new Date(r.hasta) > ahora);
  });

  otherUser = computed(() => {
    const chat = this.chat();
    if (!chat) return null;
    const other = chat.usuario_uno.id_usuario === this.myId()
      ? chat.usuario_dos
      : chat.usuario_uno;
      
    if (!other || !other.nombre) return other;
    
    const userCopy = { ...other };
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    userCopy.nombre = userCopy.nombre.replace(uuidRegex, '').replace(/-+$/, '').trim() || 'Usuario';
    return userCopy;
  });

  constructor() {
    effect(() => {
      const currentChat = this.chat();
      if (currentChat) {
        this.store.openChat(currentChat.id_chat);
        this.markRead(currentChat.id_chat);
        // Scroll al fondo inicial
        requestAnimationFrame(() => this.messageList?.scrollToBottom('auto'));
      }
    });

    // Efecto para scroll automático al recibir mensajes
    effect(() => {
      const msgs = this.store.mensajes();
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        const isFromMe = lastMsg.remitente.id_usuario === this.myId();
        if (isFromMe || this.messageList?.isNearBottom()) {
          requestAnimationFrame(() => this.messageList?.scrollToBottom('smooth'));
        }
      }
    });
  }

  private markRead(idChat: string): void {
    this.chatService.marcarLeidos(idChat).subscribe({
      next: () => {
        this.chatWsService.sendLeido(idChat);
      }
    });
  }

  sendMessage(text: string): void {
    this.store.sendMessage(text);
  }

  loadMore(): void {
    this.store.loadMore();
  }

  openReportPreview(msg: Mensaje): void {
    this.selectedReportMsg.set(msg);
    this.isPreviewModalOpen.set(true);
  }

  closePreviewModal(): void {
    this.isPreviewModalOpen.set(false);
    this.selectedReportMsg.set(null);
  }

  getAvatar(nombre: string, foto: string): string {
    return foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=106063&color=fff&size=64`;
  }

  openFlagChat(): void {
    const currentChat = this.chat();
    if (currentChat) {
      const other = this.otherUser();
      const label = other ? `Chat con ${other.nombre}` : 'Chat';
      this.flagTarget.set({ type: 'chat', id: currentChat.id_chat, label });
      this.flagModalOpen.set(true);
    }
  }

  submitFlag(): void {
    const target = this.flagTarget();
    if (!target || this.isFlagging()) return;
    this.isFlagging.set(true);

    const payload = {
      tipo_objetivo: (target.type === 'post' ? 'reporte' : target.type) as TipoObjetivo,
      id_objetivo: target.id,
      motivo: this.flagMotivo(),
      descripcion: this.flagDescripcion()
    };

    from(this.flagService.crearDenuncia(payload))
      .pipe(finalize(() => this.isFlagging.set(false)))
      .subscribe({
        next: () => {
          alert('Denuncia enviada');
          this.flagModalOpen.set(false);
          // Limpiar inputs del modal
          this.flagDescripcion.set('');
          this.flagMotivo.set('spam');
        },
        error: () => {
          alert('Error al enviar la denuncia');
        }
      });
  }

  handleMenuAction(option: DropdownOption): void {
    if (option.value === 'flag') {
      this.openFlagChat();
    }
  }
}
