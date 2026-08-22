import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { take } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ChatService } from '../../../core/services/chat.service';
import { Notification } from '../../../core/models/notification.model';
import { ProfileDropdown } from '../profile-dropdown/profile-dropdown';
import { NotificationItemComponent } from '../notification-item/notification-item.component';

import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { AuthModalComponent } from '../auth-modal/auth-modal';
import { ButtonComponent } from '../button/button';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ProfileDropdown, NotificationItemComponent, TimeAgoPipe, AuthModalComponent, ButtonComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  host: {
    '[class.is-scrolled]': 'isScrolled()',
  }
})
export class Navbar {
  protected readonly auth = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  protected readonly notificationService = inject(NotificationService);
  protected readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  isMobileMenuOpen = signal<boolean>(false);
  showNotifications = signal<boolean>(false);
  showChats = signal<boolean>(false);
  isScrolled = signal<boolean>(false);

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (typeof window !== 'undefined') {
      this.isScrolled.set(window.scrollY > 5);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isInsideBadgeArea = target.closest('.nav-badge-container');

    if (!isInsideBadgeArea) {
      this.showNotifications.set(false);
      this.showChats.set(false);
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleNotifications() {
    this.showChats.set(false); // Cerrar chats
    this.showNotifications.update((val) => !val);
    if (this.showNotifications()) {
      // Cargar siempre las últimas notificaciones al abrir el dropdown
      this.notificationService.getNotifications(1, 10).pipe(take(1)).subscribe();
    }
  }

  toggleChats() {
    this.showNotifications.set(false); // Cerrar notificaciones
    this.showChats.update((val) => !val);
    if (this.showChats()) {
      this.chatService.getMisChats().pipe(take(1)).subscribe();
    }
  }

  trackByChat(index: number, chat: any): any {
    return chat.id_chat || index;
  }

  handleNotificationClick(n: Notification) {
    this.showNotifications.set(false);
    this.notificationService.handleNotificationAction(n);
  }

  handleChatClick(chat: any) {
    this.showChats.set(false);
    this.router.navigate(['/chats'], { queryParams: { chat: chat.id_chat } });
  }

  getOtherUser(chat: any) {
    const me = this.auth.usuario()?.id_usuario;
    const other = chat.usuario_uno?.id_usuario === me ? chat.usuario_dos : chat.usuario_uno;
    if (!other || !other.nombre) {
      return { ...other, nombre: other?.nombre || 'Usuario desconocido' };
    }

    const userCopy = { ...other };
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    userCopy.nombre = userCopy.nombre.replace(uuidRegex, '').replace(/-+$/, '').trim() || 'Usuario';
    return userCopy;
  }

  getAvatar(nombre: string, foto?: string): string {
    return (
      foto ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=106063&color=fff&size=64`
    );
  }

  getMessagePreview(chat: any): string {
    const msg = chat.ultimo_mensaje;
    if (!msg) return 'No hay mensajes';
    const isFromMe = msg.id_remitente === this.auth.usuario()?.id_usuario;
    return isFromMe ? `Tú: ${msg.contenido}` : msg.contenido;
  }

  markAllRead() {
    this.notificationService.markAllAsRead().pipe(take(1)).subscribe();
  }

  clearAll() {
    this.notificationService.clearAllNotifications().pipe(take(1)).subscribe();
  }

  hideNotification(id: string) {
    this.notificationService.hideNotification(id).pipe(take(1)).subscribe();
  }
}
