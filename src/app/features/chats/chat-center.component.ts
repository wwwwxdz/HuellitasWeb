import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
  input,
  effect,
  DestroyRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Chat } from '../../core/models/chat.model';
import { ChatService } from '../../core/services/chat.service';
import { ChatWsService } from '../../core/services/chat-ws.service';
import { ConversationListComponent } from './components/conversation-list/conversation-list.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { Navbar } from '../../shared/components/navbar/navbar';

@Component({
  selector: 'app-chat-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConversationListComponent, ChatWindowComponent, Navbar],
  templateUrl: './chat-center.component.html',
  styleUrl: './chat-center.component.scss',
})
export class ChatCenterComponent {
  private chatService = inject(ChatService);
  private chatWsService = inject(ChatWsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  /** Signal Inputs de Ruta */
  openUserId = input<string | undefined>(undefined, { alias: 'open' });
  chatId = input<string | undefined>(undefined, { alias: 'chat' });
  reporteId = input<string | undefined>(undefined, { alias: 'reporte' });
  mensaje = input<string | undefined>(undefined, { alias: 'mensaje' });

  /** Signals de estado */
  chats = this.chatService.chats;
  isLoadingChats = this.chatService.isLoading;
  selectedChat = signal<Chat | null>(null);
  showMobileWindow = signal(false);

  /** Reporte pendiente de enviar al abrir el chat */
  pendingReporte = signal<{ id_reporte_mascota: string; contenido: string } | null>(null);

  constructor() {
    effect(() => {
      const openId = this.openUserId();
      const cId = this.chatId();
      const repId = this.reporteId();
      const msg = this.mensaje();

      if (openId) {
        this.pendingReporte.set({
          id_reporte_mascota: repId || '',
          contenido: msg || 'Hola, me interesa este reporte de mascota.',
        });
        this.openChatWith(openId);
      } else if (cId) {
        if (this.selectedChat()?.id_chat !== cId) {
          const chat = this.chats().find(c => c.id_chat === cId);
          if (chat) {
            this.selectedChat.set(chat);
            this.showMobileWindow.set(true);
          }
        }
      }
    });

    this.loadChats();
    this.destroyRef.onDestroy(() => this.chatWsService.disconnect());
  }


  loadChats(): void {
    this.chatService.getMisChats().subscribe({
      next: (res) => {
        // Al cargar inicialmente los chats, si hay un chatId en la URL, seleccionarlo
        const cId = this.chatId();
        if (cId && (!this.selectedChat() || this.selectedChat()?.id_chat !== cId)) {
          const chat = res.data.find(c => c.id_chat === cId);
          if (chat) {
            this.selectedChat.set(chat);
            this.showMobileWindow.set(true);
          }
        }
      },
      error: (err: any) => {
        console.error('Error cargando chats:', err);
      },
    });
  }

  openChatWith(idUsuario: string): void {
    this.chatService.openOrCreate(idUsuario).subscribe({
      next: (chat: Chat) => {
        this.chatService.upsertChat(chat);
        this.selectChat(chat);

        // Si hay reporte pendiente, enviarlo
        const reporte = this.pendingReporte();
        if (reporte) {
          this.pendingReporte.set(null);
          this.chatService
            .sendReporteMessage(chat.id_chat, reporte.id_reporte_mascota, reporte.contenido)
            .subscribe();
        }
      },
      error: () => {
        /* Silenciar error de apertura de chat */
      },
    });
  }

  selectChat(chat: Chat): void {
    this.selectedChat.set(chat);
    this.showMobileWindow.set(true);
    // Sincronizar con la URL
    this.router.navigate([], {
      queryParams: { chat: chat.id_chat, open: null, reporte: null, mensaje: null },
      replaceUrl: true
    });
  }

  closeMobileWindow(): void {
    this.showMobileWindow.set(false);
    this.selectedChat.set(null);
    // Limpiar query params de la URL al cerrar el chat
    this.router.navigate([], {
      queryParams: { chat: null, open: null, reporte: null, mensaje: null },
      replaceUrl: true
    });
  }

  onDeleteChat(chatId: string): void {
    this.chatService.hideChat(chatId).subscribe({
      next: () => {
        this.chatService.removeChat(chatId);
        if (this.selectedChat()?.id_chat === chatId) {
          this.selectedChat.set(null);
          this.showMobileWindow.set(false);
        }
      },
      error: () => {
        /* Silenciar error al ocultar chat */
      },
    });
  }

}
