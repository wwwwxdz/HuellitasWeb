import { Component, signal, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { NotificationService } from './core/services/notification.service';
import { ChatService } from './core/services/chat.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('hw');
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly chatService = inject(ChatService);

  constructor() {
    // Inicialización y limpieza reactiva basada en el estado de autenticación del usuario
    effect(() => {
      const user = this.authService.usuario();
      if (user) {
        this.notificationService.init();
        this.chatService.getMisChats().subscribe({
          error: (err) => console.error('[App] Error al precargar chats:', err)
        });
      } else {
        this.notificationService.reset();
        this.chatService.reset();
      }
    });

    // Validar la sesión al arrancar la aplicación
    this.authService.checkAuth().then();
  }
}
