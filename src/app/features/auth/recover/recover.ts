import { Component, inject, signal, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-recover-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './recover.html',
  styleUrl: './recover.scss',
})
export class RecoverComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  @ViewChildren('codeField') codeFields!: QueryList<ElementRef>;

  step = signal(1);
  generatedCode = '';
  isLoading = signal(false);
  codeValidated = signal(false);
  showPassword = signal(false);

  identifier = '';
  code: string[] = ['', '', '', '', '', ''];
  newPassword = '';
  confirmPassword = '';

  error = signal('');
  successMessage = signal('');

  onSendIdentifier(): void {
    this.error.set('');
    if (!this.identifier) {
      this.error.set('Ingresa tu correo electrónico.');
      return;
    }

    this.isLoading.set(true);

    this.authService
      .requestCode(this.identifier)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.step.set(2);
          this.generatedCode = res.code || '';
          if (this.generatedCode) {
            this.successMessage.set(`Código de prueba: ${this.generatedCode}`);
          } else {
            this.successMessage.set('Código enviado. Revisa tu correo.');
          }
        },
        error: (err) => {
          this.error.set(err.error?.error || 'Usuario no encontrado.');
        },
      });
  }

  onCodeInput(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    if (value && !/^\d+$/.test(value)) {
      this.code[index] = '';
      return;
    }
    if (value.length === 1 && index < 5) {
      const nextInput = this.codeFields.toArray()[index + 1].nativeElement;
      nextInput.focus();
    }
    if (this.code.every((digit) => digit !== '')) {
      this.codeValidated.set(true);
    }
  }

  onCodeKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.code[index] && index > 0) {
      const prevInput = this.codeFields.toArray()[index - 1].nativeElement;
      prevInput.focus();
    }
  }

  onResetPassword(): void {
    this.error.set('');

    if (!this.newPassword || !this.confirmPassword) {
      this.error.set('Completa ambos campos de contraseña.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    if (this.newPassword.length < 6) {
      this.error.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.isLoading.set(true);
    const fullCode = this.code.join('');

    this.authService
      .resetPassword({
        identifier: this.identifier,
        code: fullCode,
        new_password: this.newPassword,
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('¡Contraseña actualizada con éxito! Redirigiendo...');
          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: (err) => {
          this.error.set(err.error?.error || 'Error al restablecer contraseña.');
        },
      });
  }
}
