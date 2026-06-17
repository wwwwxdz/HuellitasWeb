import { Injectable, inject, PLATFORM_ID, OnDestroy, signal, NgZone, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, finalize, tap, take, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { ConfigService } from './config.service';
import { Notification, NotificationResponse } from '../models/notification.model';
import { NotificationWsService } from './notification-ws.service';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private zone = inject(NgZone);
  private router = inject(Router);
  private ws = inject(NotificationWsService);
  private configService = inject(ConfigService);

  private get apiUrl() {
    return `${this.configService.apiUrl()}/notificaciones`;
  }

  // ── Signals ───────────────────────────────────────────────────────────────
  private readonly _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  private readonly _unreadCount = signal(0);
  readonly unreadCount = this._unreadCount.asReadonly();

  readonly isLoading = signal(false);
  readonly hasNotifications = computed(() => (this._notifications() ?? []).length > 0);

  private _total = signal(0);
  readonly total = this._total.asReadonly();

  // ── Estado interno ────────────────────────────────────────────────────────
  private wsSubscription: Subscription | null = null;
  private boundVisibilityHandler = this.onVisibilityChange.bind(this);

  // ── Inicialización ────────────────────────────────────────────────────────

  init(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1. Conexión WebSocket (Notificaciones en tiempo real + Heartbeat)
    this.ws.connect();
    
    // Evitar suscripciones duplicadas al reinicializar el servicio
    this.wsSubscription?.unsubscribe();
    
    // 2. Escuchar eventos del servidor
    this.wsSubscription = this.ws.events$.subscribe({
      next: (event) => {
        try {
          if (!event) return;
          if (event.tipo === 'CONTEO') {
            this.zone.run(() => this._unreadCount.set(event.payload ?? 0));
          } else if (event.tipo === 'NOTIFICACION' && event.payload?.id_notificacion) {
            this.zone.run(() => {
              this._notifications.update((list) => {
                const currentList = list ?? [];
                // Evitar duplicados por si acaso el websocket y HTTP coinciden
                const exists = currentList.some(n => n?.id_notificacion === event.payload.id_notificacion);
                return exists ? currentList : [event.payload, ...currentList];
              });
            });
          }
        } catch (err) {
          console.error('[WS Subscription] Error procesando evento:', err, event);
        }
      },
      error: (err) => {
        console.error('[WS Subscription] Error en flujo de eventos:', err);
      }
    });

    // 3. Conteo inmediato por HTTP (fallback inicial)
    this.fetchUnreadCount();

    // 4. Actualizar al volver a la pestaña
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);
  }

  /** Refresca el conteo cuando el usuario vuelve a la pestaña */
  private onVisibilityChange(): void {
    if (document.visibilityState === 'visible' && localStorage.getItem('token')) {
      this.fetchUnreadCount();
    }
  }

  /** UNA petición HTTP liviana */
  private fetchUnreadCount(): void {
    this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).subscribe({
      next: (res) => this.zone.run(() => this._unreadCount.set(res.count)),
      error: () => {},
    });
  }

  // ── HTTP ──────────────────────────────────────────────────────────────────

  getNotifications(page = 1, limit = 20): Observable<NotificationResponse> {
    this.isLoading.set(true);
    return this.http.get<NotificationResponse>(`${this.apiUrl}?page=${page}&limit=${limit}`).pipe(
      tap((res) => {
        this.zone.run(() => {
          const data = res.data ?? [];
          if (page === 1) {
            this._notifications.set(data);
          } else {
            this._notifications.update((current) => [...current, ...data]);
          }
          this._total.set(res.total ?? 0);
        });
      }),
      finalize(() => this.zone.run(() => this.isLoading.set(false))),
    );
  }

  markAsRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/marcar-leida/${id}`, {}).pipe(
      tap(() => {
        this.zone.run(() => {
          this._notifications.update((list) =>
            list.map((n) => (n.id_notificacion === id && !n.leido ? { ...n, leido: true } : n)),
          );
          this._unreadCount.update((c) => Math.max(0, c - 1));
        });
      }),
    );
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/marcar-todas-leidas`, {}).pipe(
      tap(() => {
        this.zone.run(() => {
          this._notifications.update((list) => list.map((n) => ({ ...n, leido: true })));
          this._unreadCount.set(0);
        });
      }),
    );
  }

  clearAllNotifications(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/limpiar-todas`, {}).pipe(
      tap(() => {
        this.zone.run(() => {
          this._notifications.set([]);
          this._unreadCount.set(0);
          this._total.set(0);
        });
      }),
    );
  }

  hideNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.zone.run(() => {
          this._notifications.update((list) => list.filter((n) => n.id_notificacion !== id));
          this._unreadCount.update((c) => Math.max(0, c - 1));
        });
      }),
    );
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/hard-delete/${id}`).pipe(
      tap(() => {
        this.zone.run(() => {
          this._notifications.update((list) => list.filter((n) => n.id_notificacion !== id));
          this._unreadCount.update((c) => Math.max(0, c - 1));
        });
      }),
    );
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  handleNotificationAction(n: Notification): void {
    if (!n.leido) {
      this.markAsRead(n.id_notificacion).pipe(take(1)).subscribe();
    }
    this.navigateToEntity(n);
  }

  navigateToEntity(n: Notification): void {
    const tipo = n.entidad_tipo?.toUpperCase();
    switch (tipo) {
      case 'REPORTE':   this.router.navigate(['/pets/reports/detail', n.id_entidad]); break;
      case 'CHAT':      this.router.navigate(['/chats'], { queryParams: { chat: n.id_entidad } }); break;
      default:          this.router.navigate(['/notifications']); break;
    }
  }

  reset(): void {
    this.ws.disconnect();
    this.wsSubscription?.unsubscribe();
    this.wsSubscription = null;
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    }
    this._notifications.set([]);
    this._unreadCount.set(0);
  }

  ngOnDestroy(): void {
    this.reset();
  }
}
