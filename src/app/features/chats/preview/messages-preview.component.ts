import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Chat } from '../../../core/models/chat.model';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-messages-preview',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar, TimeAgoPipe],
  templateUrl: './messages-preview.component.html',
  styleUrl: './messages-preview.component.scss'
})
export class MessagesPreviewComponent implements OnInit {
  protected chatService = inject(ChatService);
  private authService = inject(AuthService);
  private router = inject(Router);

  chats = this.chatService.chats;
  isLoading = this.chatService.isLoading;
  totalChats = this.chatService.totalChats;

  myId = computed(() => this.authService.usuario()?.id_usuario ?? '');

  ngOnInit(): void {
    // Cargar chats actualizados al entrar a la vista
    this.chatService.getMisChats().subscribe({
      error: (err) => console.error('[MessagesPreview] Error cargando chats:', err)
    });
  }

  getOtherUser(chat: Chat) {
    const me = this.myId();
    const other = chat.usuario_uno?.id_usuario === me ? chat.usuario_dos : chat.usuario_uno;
    if (!other || !other.nombre) {
      return { ...other, nombre: other?.nombre || 'Usuario desconocido' } as { nombre: string; foto_perfil?: string; id_usuario: string; activo?: boolean };
    }
    
    const userCopy = { ...other };
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    userCopy.nombre = userCopy.nombre.replace(uuidRegex, '').replace(/-+$/, '').trim() || 'Usuario';
    return userCopy as any;
  }

  getAvatar(nombre: string, foto?: string): string {
    return foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=106063&color=fff&size=64`;
  }

  /**
   * Obtiene la previsualización del mensaje.
   * Si es de la otra persona, se muestra directamente.
   * Si es del propio usuario, se muestra con el prefijo "Tú: ".
   */
  getMessagePreview(chat: Chat): string {
    const msg = chat.ultimo_mensaje;
    if (!msg) return 'No hay mensajes en esta conversación';
    
    const isFromMe = msg.id_remitente === this.myId();
    if (isFromMe) {
      return `Tú: ${msg.contenido}`;
    }
    return msg.contenido;
  }

  openChat(chat: Chat): void {
    // Redirige al chat center abriendo este chat en específico
    this.router.navigate(['/chats'], { queryParams: { chat: chat.id_chat } });
  }

  trackByChat(_: number, c: Chat) {
    return c.id_chat;
  }
}
