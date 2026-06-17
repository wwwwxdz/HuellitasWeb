import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ConfigService } from './config.service';
import { Chat, ChatsResponse, Mensaje, MensajesResponse } from '../models/chat.model';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);
  private auth = inject(AuthService);

  private get apiUrl() {
    return `${this.configService.apiUrl()}/chats`;
  }

  // ─── Signals de Estado ──────────────────────────────────────────────────
  private readonly _chats = signal<Chat[]>([]);
  private readonly _isLoading = signal<boolean>(false);

  /** Señal pública de solo lectura con la lista de chats */
  readonly chats = this._chats.asReadonly();
  /** Señal pública de solo lectura del estado de carga */
  readonly isLoading = this._isLoading.asReadonly();

  /** Total de chats disponibles */
  readonly totalChats = computed(() => this._chats().length);

  /** Conteo global de chats no leídos */
  readonly unreadChatsCount = computed(() => {
    const list = this._chats();
    const myId = this.auth.usuario()?.id_usuario;
    if (!myId) return 0;
    
    return list.filter((c) => {
      // Un chat no está leído si mensajes_sin_leer > 0, o si último mensaje existe y leido es false y el remitente no soy yo
      if (c.mensajes_sin_leer > 0) return true;
      if (c.ultimo_mensaje && !c.ultimo_mensaje.leido && c.ultimo_mensaje.id_remitente !== myId) return true;
      return false;
    }).length;
  });

  // ─── HTTP ────────────────────────────────────────────────────────────────

  /** Abre o recupera un chat con otro usuario */
  openOrCreate(idUsuarioDos: string): Observable<Chat> {
    return this.http.post<Chat>(this.apiUrl, { id_usuario_dos: idUsuarioDos });
  }

  /** Lista todos los chats del usuario autenticado y actualiza la señal interna */
  getMisChats(): Observable<ChatsResponse> {
    this._isLoading.set(true);
    return this.http.get<ChatsResponse>(this.apiUrl).pipe(
      tap({
        next: (res: ChatsResponse) => {
          this._chats.set(res.data ?? []);
          this._isLoading.set(false);
        },
        error: () => this._isLoading.set(false),
      })
    );
  }

  /** Actualiza o añade un chat a la lista local (Signal) */
  upsertChat(chat: Chat): void {
    this._chats.update((prev) => {
      const idx = prev.findIndex((c) => c.id_chat === chat.id_chat);
      if (idx === -1) return [chat, ...prev];
      const next = [...prev];
      next[idx] = chat;
      return next;
    });
  }

  /** Elimina un chat de la lista local (Signal) */
  removeChat(idChat: string): void {
    this._chats.update((prev) => prev.filter((c) => c.id_chat !== idChat));
  }

  /** Historial de mensajes paginado */
  getMensajes(idChat: string, page = 1, limit = 30): Observable<MensajesResponse> {
    return this.http.get<MensajesResponse>(
      `${this.apiUrl}/${idChat}/mensajes?page=${page}&limit=${limit}`,
    );
  }

  /** Marca todos los mensajes del otro usuario como leídos */
  marcarLeidos(idChat: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${idChat}/leidos`, {}).pipe(
      tap(() => {
        this._chats.update((prev) =>
          prev.map((c) => {
            if (c.id_chat === idChat) {
              return {
                ...c,
                mensajes_sin_leer: 0,
                ultimo_mensaje: c.ultimo_mensaje ? { ...c.ultimo_mensaje, leido: true } : null,
              };
            }
            return c;
          })
        );
      })
    );
  }

  /** Oculta (elimina) el chat solo para el usuario actual */
  hideChat(idChat: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${idChat}`);
  }

  /** Envía un mensaje con reporte embebido via HTTP */
  sendReporteMessage(idChat: string, idReporte: string, contenido = ''): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.apiUrl}/${idChat}/mensajes`, {
      tipo: 'reporte',
      id_reporte_mascota: idReporte,
      contenido,
    });
  }

  reset(): void {
    this._chats.set([]);
  }
}
