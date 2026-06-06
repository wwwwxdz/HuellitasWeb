import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ConfigService } from './config.service';
import { Comentario, CommentLikeResponse } from '../models/comment.model';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly configService = inject(ConfigService);
  
  private get apiUrl(): string {
    return this.configService.apiUrl();
  }

  private get userId(): string {
    return this.authService.usuario()?.id_usuario ?? '';
  }

  /**
   * Obtiene los comentarios de un reporte de mascota.
   * Endpoint: GET /api/v1/reportes/{reporteId}/comentarios?id_usuario={userId}
   */
  async getComments(reporteId: string): Promise<Comentario[]> {
    const uid = this.userId;
    const url = uid 
      ? `${this.apiUrl}/reportes/${reporteId}/comentarios?id_usuario=${uid}`
      : `${this.apiUrl}/reportes/${reporteId}/comentarios`;
    try {
      return await firstValueFrom(this.http.get<Comentario[]>(url));
    } catch (error) {
      console.warn(`Error al obtener comentarios reales para reporte ${reporteId}. Usando fallback local:`, error);
      return [];
    }
  }

  /**
   * Agrega un comentario principal a un reporte de mascota.
   * Endpoint: POST /api/v1/reportes/{reporteId}/comentarios?id_usuario={userId}
   */
  async addComment(reporteId: string, contenido: string): Promise<Comentario> {
    const uid = this.userId;
    if (!uid) throw new Error('Usuario no autenticado');
    
    return await firstValueFrom(
      this.http.post<Comentario>(
        `${this.apiUrl}/reportes/${reporteId}/comentarios?id_usuario=${uid}`,
        { contenido }
      )
    );
  }

  /**
   * Responde a un comentario de mascota.
   * Endpoint: POST /api/v1/reportes/{reporteId}/comentarios/{comentarioId}/responder?id_usuario={userId}
   */
  async reply(reporteId: string, comentarioId: string, contenido: string): Promise<Comentario> {
    const uid = this.userId;
    if (!uid) throw new Error('Usuario no autenticado');

    return await firstValueFrom(
      this.http.post<Comentario>(
        `${this.apiUrl}/reportes/${reporteId}/comentarios/${comentarioId}/responder?id_usuario=${uid}`,
        { contenido }
      )
    );
  }

  /**
   * Elimina un comentario por su ID.
   * Endpoint: DELETE /api/v1/reportes/{reporteId}/comentarios/{comentarioId}?id_usuario={userId}
   */
  async deleteComment(reporteId: string, comentarioId: string): Promise<void> {
    const uid = this.userId;
    if (!uid) throw new Error('Usuario no autenticado');

    await firstValueFrom(
      this.http.delete<void>(
        `${this.apiUrl}/reportes/${reporteId}/comentarios/${comentarioId}?id_usuario=${uid}`
      )
    );
  }

  /**
   * Alterna el like de un comentario.
   * Endpoint: POST /api/v1/comentarios/{comentarioId}/likes?id_usuario={userId}
   */
  async toggleCommentLike(comentarioId: string): Promise<CommentLikeResponse> {
    const uid = this.userId;
    if (!uid) throw new Error('Usuario no autenticado');

    return await firstValueFrom(
      this.http.post<CommentLikeResponse>(
        `${this.apiUrl}/comentarios/${comentarioId}/likes?id_usuario=${uid}`,
        {}
      )
    );
  }
}
