import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ModalComponent } from '../modal/modal';
import { ButtonComponent } from '../button/button';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, ButtonComponent],
  templateUrl: './auth-modal.html',
  styleUrl: './auth-modal.scss'
})
export class AuthModalComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  close(): void {
    this.authService.closeAuthModal();
  }

  goToLogin(): void {
    this.close();
    // Redirige al login guardando la ruta actual para el retorno
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  goToRegister(): void {
    this.close();
    this.router.navigate(['/register']);
  }
}
