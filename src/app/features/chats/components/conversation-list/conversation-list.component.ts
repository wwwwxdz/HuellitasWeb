import { Component, inject, input, signal, computed, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat } from '../../../../core/models/chat.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { ButtonComponent } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './conversation-list.component.html',
  styleUrl: './conversation-list.component.scss',
})
export class ConversationListComponent {
  private authService = inject(AuthService);

  // Modern Signal Inputs
  chats = input<Chat[]>([]);
  selectedChatId = input<string | null>(null);
  isLoading = input<boolean>(false);

  // Modern Outputs
  chatSelected = output<Chat>();
  deleteChat = output<string>();

  searchQuery = signal('');

  get myId(): string {
    return this.authService.usuario()?.id_usuario ?? '';
  }

  filteredChats = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.chats();
    return this.chats().filter(c => 
      this.getOtherUser(c).nombre.toLowerCase().includes(query)
    );
  });

  getOtherUser(chat: Chat) {
    const other = chat.usuario_uno?.id_usuario === this.myId ? chat.usuario_dos : chat.usuario_uno;
    if (!other || !other.nombre) {
      return { ...other, nombre: other?.nombre || 'Usuario desconocido' } as { nombre: string; foto_perfil?: string; id_usuario: string; activo?: boolean };
    }
    
    const userCopy = { ...other };
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    userCopy.nombre = userCopy.nombre.replace(uuidRegex, '').replace(/-+$/, '').trim() || 'Usuario';
    return userCopy as any;
  }

  hasUnread(chat: Chat): boolean {
    return chat.ultimo_mensaje != null && !chat.ultimo_mensaje.leido;
  }

  getAvatar(nombre: string, foto?: string): string {
    return foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=106063&color=fff&size=64`;
  }

  trackByChat(_: number, c: Chat) { return c.id_chat; }

  isDeleteModalOpen = signal(false);
  chatToDelete = signal<Chat | null>(null);

  onDelete(event: Event, chat: Chat): void {
    event.stopPropagation();
    this.chatToDelete.set(chat);
    this.isDeleteModalOpen.set(true);
  }

  confirmDelete(): void {
    const chat = this.chatToDelete();
    if (chat) {
      this.deleteChat.emit(chat.id_chat);
    }
    this.closeDeleteModal();
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.chatToDelete.set(null);
  }
}
