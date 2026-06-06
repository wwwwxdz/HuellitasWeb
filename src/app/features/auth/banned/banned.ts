import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-banned-page',
  standalone: true,
  template: `
    <div class="banned-page">
      <div class="banned-card">
        <div class="banned-icon">
          <i class="material-icons">block</i>
        </div>
        <h1>Cuenta Suspendida</h1>
        <p>
          Tu cuenta ha sido suspendida por un administrador debido a una violación de nuestras
          políticas de uso. Si crees que esto es un error, por favor contacta a nuestro equipo de soporte.
        </p>
        <button class="btn-back" (click)="goHome()">
          <i class="material-icons">arrow_back</i>
          Volver al Inicio
        </button>
      </div>
    </div>
  `,
  styles: [`
    .banned-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-dark);
      padding: 2rem;
    }

    .banned-card {
      max-width: 480px;
      text-align: center;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      padding: 3rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    }

    .banned-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem auto;
    }

    .banned-icon i {
      font-size: 2.5rem;
      color: #ef4444;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 1rem 0;
    }

    p {
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.6;
      margin: 0 0 2rem 0;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: var(--primary-hover);
      transform: translateY(-2px);
    }
  `],
})
export class BannedComponent {
  private readonly router = inject(Router);

  goHome(): void {
    localStorage.removeItem('is_banned_user');
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }
}
