import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { ChatService } from '../../../core/services/chat.service';
import { ChatWsService } from '../../../core/services/chat-ws.service';
import { PetService } from '../../../core/services/pet.service';
import { Mensaje, MensajesResponse, WsEvent } from '../../../core/models/chat.model';
import { PetReport } from '../../../core/models/pet.model';
import { finalize, Subscription, from } from 'rxjs';

/**
 * ChatStore - Centraliza el estado de una ventana de chat siguiendo SOLID (SRP).
 * Maneja el historial de mensajes, conexión WebSocket y carga de reportes embebidos.
 */
@Injectable()
export class ChatStore implements OnDestroy {
  private chatService = inject(ChatService);
  private chatWsService = inject(ChatWsService);
  private petService = inject(PetService);

  // ─── Estado de Datos ────────────────────────────────────────────────────
  readonly mensajes = signal<Mensaje[]>([]);
  readonly currentChatId = signal<string | null>(null);
  
  // ─── Estado de UI ───────────────────────────────────────────────────────
  readonly isLoading = signal(false);
  readonly isLoadingMore = signal(false);
  readonly isSending = signal(false);
  readonly hasMore = signal(false);
  readonly page = signal(1);

  private wsSub?: Subscription;

  // ─── Selectores Computados ──────────────────────────────────────────────
  readonly isConnected = this.chatWsService.isConnected;

  // ─── Acciones ───────────────────────────────────────────────────────────

  openChat(idChat: string) {
    this.currentChatId.set(idChat);
    this.mensajes.set([]);
    this.page.set(1);
    this.hasMore.set(false);
    
    this.disconnect();
    this.loadHistory(idChat, true);
    this.connect(idChat);
  }

  loadHistory(idChat: string, initial = false) {
    if (initial) this.isLoading.set(true);
    else this.isLoadingMore.set(true);

    this.chatService.getMensajes(idChat, this.page())
      .pipe(finalize(() => {
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      }))
      .subscribe({
        next: (res: MensajesResponse) => {
          if (initial) {
            this.mensajes.set(res.data);
          } else {
            this.mensajes.update(prev => [...res.data, ...prev]);
          }
          this.hasMore.set(res.has_more);
          this.checkMissingReports();
        }
      });
  }

  loadMore() {
    const id = this.currentChatId();
    if (this.isLoadingMore() || !this.hasMore() || !id) return;
    this.page.update(p => p + 1);
    this.loadHistory(id);
  }

  sendMessage(text: string) {
    const id = this.currentChatId();
    if (!text || !id) return;
    this.chatWsService.sendMessage(id, text);
  }

  private connect(idChat: string) {
    this.chatWsService.connect(idChat);
    this.wsSub = this.chatWsService.events$.subscribe((event: WsEvent) => {
      if (event.tipo === 'pong') return;
      if (event.id_chat !== idChat) return;

      if (event.tipo === 'mensaje') {
        this.mensajes.update(prev => [...prev, event.payload]);
        this.checkMissingReports();
      } else if (event.tipo === 'leido') {
        // Marcar mensajes propios como leídos (asumiendo que el remitente no es el usuario actual si viene de afuera)
        // Pero en WS 'leido' suele significar que el OTRO leyó mis mensajes.
        this.mensajes.update(prev => prev.map(m => ({ ...m, leido: true })));
      }
    });
  }

  disconnect() {
    this.chatWsService.disconnect();
    this.wsSub?.unsubscribe();
  }

  private checkMissingReports() {
    this.mensajes().forEach(m => {
      if (m.tipo === 'reporte' && !m.reporte_mascota && m.id_reporte_mascota) {
        this.fetchReport(m);
      }
    });
  }

  private fetchReport(msg: Mensaje) {
    if (!msg.id_reporte_mascota) return;
    from(this.petService.getReporte(msg.id_reporte_mascota)).subscribe({
      next: (report) => {
        const r = report as PetReport;
        msg.reporte_mascota = {
          id_reporte_mascota: r.id_reporte_mascota || '',
          nombre: r.nombre || 'Sin nombre',
          estado: r.estado,
          ubicacion: r.ubicacion || (r.distrito ? `${r.distrito}, ${r.provincia}` : 'No especificada'),
          descripcion: r.descripcion,
          imagen_principal: r.imagen_principal ? { url: r.imagen_principal.url } : undefined
        };
        this.mensajes.update(prev => [...prev]);
      }
    });
  }

  ngOnDestroy() {
    this.disconnect();
  }
}
