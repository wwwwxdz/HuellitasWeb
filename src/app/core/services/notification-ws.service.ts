import { Injectable, inject, PLATFORM_ID, signal, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { ConfigService } from './config.service';

export interface NotificationWsEvent {
  tipo: 'NOTIFICACION' | 'CONTEO' | 'PING';
  payload: any;
}

@Injectable({ providedIn: 'root' })
export class NotificationWsService implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private configService = inject(ConfigService);
  
  private ws: WebSocket | null = null;
  private pingInterval: any = null;
  private reconnectTimeout: any = null;
  private isManualDisconnect = false;

  readonly events$ = new Subject<NotificationWsEvent>();
  private readonly _isConnected = signal<boolean>(false);
  readonly isConnected = this._isConnected.asReadonly();

  connect(): void {
    if (!isPlatformBrowser(this.platformId) || this.ws) return;
    this.isManualDisconnect = false;

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[WS] ⚠️ No se puede conectar: Token no encontrado en localStorage');
      return;
    }

    try {
      const url = this.getWsUrl(token);
      console.log(`[WS] 🚀 Intentando conectar a: ${url.split('?')[0]}`);

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WS] ✅ Conexión establecida correctamente');
        this._isConnected.set(true);
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.events$.next(data);
        } catch (e) {
          // Ignorar mensajes no JSON (como pings nativos)
        }
      };

      this.ws.onclose = (event) => {
        if (!this.isManualDisconnect) {
          console.warn(`[WS] 🔌 Conexión cerrada (Código: ${event.code}). Reintentando en 5s...`);
          this.handleClose();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] ❌ Error detectado:', error);
      };

    } catch (err) {
      console.error('[WS] 💥 Error crítico al crear el WebSocket:', err);
      this.handleClose();
    }
  }

  private getWsUrl(token: string): string {
    let apiAddr = this.configService.apiUrl();
    
    // Si la URL es relativa (/api/v1), la convertimos en absoluta para el WebSocket
    if (apiAddr.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      apiAddr = `${protocol}//${window.location.host}${apiAddr}`;
    } else {
      apiAddr = apiAddr.replace('http://', 'ws://').replace('https://', 'wss://');
    }

    // Limpiar posibles dobles slashes
    const finalUrl = `${apiAddr}/notificaciones/ws?token=${token}`.replace(/([^:]\/)\/+/g, "$1");
    return finalUrl;
  }

  private startHeartbeat(): void {
    this.clearPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ tipo: 'ping' }));
      }
    }, 25_000);
  }

  private handleClose(): void {
    this._isConnected.set(false);
    this.clearPing();
    this.ws = null;
    this.clearReconnect();
    this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
  }

  private clearPing(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = null;
  }

  private clearReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    this.clearPing();
    this.clearReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._isConnected.set(false);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
