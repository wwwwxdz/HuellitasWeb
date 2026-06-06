import { Injectable, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { ConfigService } from '../services/config.service';
import {
  UsuarioSession,
  LoginResponse,
  RegisterCodeResponse,
  RegisterResponse,
  ResetPasswordPayload,
  Permiso,
  Restriccion,
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly configService = inject(ConfigService);

  private get apiUrl(): string {
    return this.configService.apiUrl();
  }

  // Estado global de sesión basado en señales
  readonly usuario = signal<UsuarioSession | null>(this.loadFromStorage());
  readonly isAuthenticated = computed(() => !!this.usuario());
  readonly permisos = computed(() => this.usuario()?.permisos ?? ([] as Permiso[]));
  readonly rol = computed(() => this.usuario()?.role?.slug ?? '');
  readonly restricciones = computed(() => this.usuario()?.restricciones ?? ([] as Restriccion[]));
  readonly isLoading = signal<boolean>(false);

  // --- Persistencia en localStorage ---

  private loadFromStorage(): UsuarioSession | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  }

  private saveToStorage(u: UsuarioSession): void {
    if (this.isBrowser) localStorage.setItem('usuario', JSON.stringify(u));
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // --- Autenticación ---

  /** Sincroniza los datos del usuario actual desde el servidor */
  refreshUser(): Observable<UsuarioSession> {
    return this.http.get<UsuarioSession>(`${this.apiUrl}/auth/me`).pipe(
      tap((u) => {
        if (this.isBrowser) {
          localStorage.setItem('permisos', JSON.stringify(u.permisos ?? []));
        }
        this.saveToStorage(u);
        this.usuario.set(u);
      })
    );
  }

  /** Verifica la sesión al arrancar la app */
  async checkAuth(): Promise<void> {
    const token = this.getToken();
    if (!token) {
      this.usuario.set(null);
      return;
    }

    try {
      this.isLoading.set(true);
      const profile = await firstValueFrom(this.refreshUser());

      if (profile.esta_baneado) {
        if (this.isBrowser) localStorage.setItem('is_banned_user', 'true');
        this.logout();
        this.router.navigate(['/banned']);
      }
    } catch {
      // Token inválido o expirado
      if (this.isBrowser) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('permisos');
      }
      this.usuario.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res) => {
        if (this.isBrowser) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('permisos', JSON.stringify(res.usuario.permisos ?? []));
          localStorage.removeItem('is_banned_user');
          this.saveToStorage(res.usuario);
        }
        this.usuario.set(res.usuario);
      })
    );
  }

  requestRegisterCode(email: string): Observable<RegisterCodeResponse> {
    return this.http.post<RegisterCodeResponse>(`${this.apiUrl}/auth/request-register-code`, { email });
  }

  registerWithCode(payload: { email: string; code: string; nombre: string; password: string }): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register-with-code`, payload);
  }

  requestCode(identifier: string): Observable<{ message: string; code?: string }> {
    return this.http.post<{ message: string; code?: string }>(`${this.apiUrl}/auth/request-code`, { identifier });
  }

  resetPassword(payload: ResetPasswordPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/reset-password`, payload);
  }

  logout(withReturnUrl = false): void {
    const token = this.getToken();

    const clearSession = () => {
      if (this.isBrowser) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('permisos');
        localStorage.removeItem('is_banned_user');
      }
      this.usuario.set(null);

      const extras = withReturnUrl ? { queryParams: { returnUrl: this.router.url } } : {};
      this.router.navigate(['/login'], extras);
    };

    if (token) {
      this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
        next: () => clearSession(),
        error: () => clearSession(),
      });
    } else {
      clearSession();
    }
  }

  // --- Permisos y restricciones ---

  hasRestriccion(tipo: 'comentario' | 'publicacion' | 'perfil' | 'chat'): boolean {
    const restricciones = this.restricciones();
    if (!restricciones.length) return false;
    const ahora = new Date();
    return restricciones.some((r) => r.tipo === tipo && r.activo !== false && new Date(r.hasta) > ahora);
  }

  /** Actualiza parcialmente el estado local del usuario */
  patchUsuario(patch: Partial<UsuarioSession>): void {
    const current = this.usuario();
    if (!current) return;
    const updated = { ...current, ...patch };
    this.saveToStorage(updated);
    this.usuario.set(updated);
  }
}
