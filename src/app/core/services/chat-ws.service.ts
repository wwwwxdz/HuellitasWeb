import { Injectable, inject, PLATFORM_ID, signal, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { ConfigService } from './config.service';
import { WsEvent } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatWsService implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private configService = inject(ConfigService);
  
  private get wsBase() {
    let apiAddr = this.configService.apiUrl();
    return apiAddr
      .replace('http://', 'ws://')
      .replace('https://', 'wss://')
      .replace('/api/v1', '');
  }

  private ws: WebSocket | null = null;
  private pingInterval: any = null;

  /** Emite cada evento recibido por WS */
  readonly events$ = new Subject<WsEvent>();

  private readonly _isConnected = signal<boolean>(false);
  /** Señal pública de solo lectura del estado de conexión */
  readonly isConnected = this._isConnected.asReadonly();

  /** Conecta al WebSocket de un chat específico */
  connect(idChat: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.disconnect();

    const token = localStorage.getItem('token') ?? '';
    const url = `${this.wsBase}/api/v1/chats/${idChat}/ws?token=${token}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this._isConnected.set(true);
      // Keepalive cada 25 s
      this.pingInterval = setInterval(() => this.send({ tipo: 'ping' }), 25_000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsEvent;
        // El payload puede venir como string JSON anidado
        if (data.tipo === 'mensaje' && typeof data.payload === 'string') {
          try {
            data.payload = JSON.parse(data.payload as string);
          } catch {
            // Error al parsear payload anidado
          }
        }
        this.events$.next(data);
      } catch {
        // ignorar mensajes malformados
      }
    };

    this.ws.onclose = () => this.handleClose();
    this.ws.onerror = () => this.handleClose();
  }

  /** Cierra la conexión activa */
  disconnect(): void {
    this.clearPing();
    if (this.ws) {
      this.ws.onclose = null; 
      this.ws.close();
      this.ws = null;
    }
    this._isConnected.set(false);
  }

  /** Envía un mensaje de texto simple */
  sendMessage(idChat: string, contenido: string): void {
    this.send({ tipo: 'mensaje', id_chat: idChat, payload: { contenido } });
  }

  /** Envía señal de lectura */
  sendLeido(idChat: string): void {
    this.send({ tipo: 'leido', id_chat: idChat });
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleClose(): void {
    this._isConnected.set(false);
    this.clearPing();
  }

  private clearPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
