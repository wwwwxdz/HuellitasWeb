import { Component, inject, signal, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfigService } from '../../../core/services/config.service';
import { finalize } from 'rxjs';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class AuthComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  public readonly configService = inject(ConfigService);

  mode = signal<AuthMode>('login');
  isLoading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  registerStep = signal(1);
  generatedCode = '';
  code: string[] = ['', '', '', '', '', ''];
  @ViewChildren('codeField') codeFields!: QueryList<ElementRef>;
  isCodeValid = signal(false);

  loginData = { email: '', password: '' };
  registerData = { nombre: '', email: '', password: '', confirmPassword: '' };

  error = signal('');
  successMessage = signal('');

  setMode(newMode: AuthMode): void {
    this.mode.set(newMode);
    this.showPassword.set(false);
    this.showConfirmPassword.set(false);
    this.error.set('');
    this.successMessage.set('');
    this.registerStep.set(1);
    this.code = ['', '', '', '', '', ''];
    this.isCodeValid.set(false);
  }

  // --- LOGIN ---

  onLogin(): void {
    this.error.set('');
    if (!this.loginData.email || !this.loginData.password) {
      this.error.set('Por favor completa todos los campos.');
      return;
    }

    this.isLoading.set(true);

    this.authService.login(this.loginData.email, this.loginData.password).subscribe({
      next: (res) => {
        this.isLoading.set(false);

        if (res.usuario?.esta_baneado) {
          localStorage.setItem('is_banned_user', 'true');
          this.router.navigate(['/banned']);
          return;
        }

        this.successMessage.set(`¡Bienvenido, ${res.usuario.nombre}!`);

        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        setTimeout(() => this.router.navigateByUrl(returnUrl), 150);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = (err.error?.error || '').toLowerCase();

        if (err.status === 403 || msg.includes('baneado')) {
          localStorage.setItem('is_banned_user', 'true');
          this.router.navigate(['/banned']);
          return;
        }

        if (err.status === 401) {
          this.error.set('Credenciales incorrectas. Verifica tu correo y contraseña.');
        } else {
          this.error.set(err.error?.error || 'Error al iniciar sesión. Intenta de nuevo.');
        }
      },
    });
  }

  // --- REGISTER ---

  onRegister(): void {
    this.error.set('');

    if (this.registerStep() === 1) {
      if (!this.registerData.email) {
        this.error.set('Ingresa un correo electrónico válido.');
        return;
      }

      this.isLoading.set(true);
      this.authService
        .requestRegisterCode(this.registerData.email)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (res) => {
            this.registerStep.set(2);
            this.generatedCode = res.code || '';
            this.isCodeValid.set(false);
            if (this.generatedCode) {
              this.successMessage.set(`Código de prueba: ${this.generatedCode}`);
            } else {
              this.successMessage.set('Código de verificación enviado a tu correo.');
            }
          },
          error: (err) => {
            this.error.set(err.error?.error || 'Error al enviar el código.');
          },
        });
      return;
    }

    // Step 2: Registro final
    const fullCode = this.code.join('');
    if (fullCode !== this.generatedCode) {
      this.error.set('Código de verificación incorrecto.');
      return;
    }

    if (!this.registerData.nombre || !this.registerData.password) {
      this.error.set('Completa todos los campos.');
      return;
    }
    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.isLoading.set(true);

    this.authService
      .registerWithCode({
        email: this.registerData.email,
        code: fullCode,
        nombre: this.registerData.nombre,
        password: this.registerData.password,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.successMessage.set('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
          this.setMode('login');
          this.loginData.email = this.registerData.email;
          this.registerData = { nombre: '', email: '', password: '', confirmPassword: '' };
        },
        error: (err) => {
          this.isLoading.set(false);
          this.error.set(err.error?.error || 'Error al crear la cuenta. Verifica el código.');
        },
      });
  }

  // --- Código input helpers ---

  checkCodeValidity(): void {
    const fullCode = this.code.join('');
    const isValid = fullCode.length === 6 && fullCode === this.generatedCode;
    this.isCodeValid.set(isValid);
    if (isValid) {
      this.error.set(''); // Limpiar cualquier error previo de código si ya coincide
    }
  }

  onCodeInput(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    if (value && !/^\d+$/.test(value)) {
      this.code[index] = '';
      this.checkCodeValidity();
      return;
    }
    this.checkCodeValidity();
    if (value.length === 1 && index < 5) {
      const nextInput = this.codeFields.toArray()[index + 1].nativeElement;
      nextInput.focus();
    }
  }

  onCodeKeyDown(index: number, event: KeyboardEvent): void {
    setTimeout(() => this.checkCodeValidity(), 0); // Esperar a que el DOM se actualice en Backspace
    if (event.key === 'Backspace' && !this.code[index] && index > 0) {
      const prevInput = this.codeFields.toArray()[index - 1].nativeElement;
      prevInput.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    const data = event.clipboardData?.getData('text');
    if (!data || !/^\d{6}$/.test(data)) return;

    event.preventDefault();
    data.split('').forEach((digit, i) => {
      if (i < 6) this.code[i] = digit;
    });

    this.checkCodeValidity();
    const lastInput = this.codeFields.toArray()[5].nativeElement;
    lastInput.focus();
  }

  /** Espacio → @ y bloquea espacios si ya hay un @ */
  handleEmailKeyDown(event: KeyboardEvent, data: { email: string }): void {
    if (event.key === ' ') {
      event.preventDefault();
      if (!data.email.includes('@')) {
        data.email += '@';
      }
    }
  }
}
