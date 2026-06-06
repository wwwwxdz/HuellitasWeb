import { Component, input, output, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AvatarComponent } from '../avatar/avatar';
import { BadgeComponent } from '../badge/badge';
import { OptionsDropdownComponent } from '../options-dropdown/options-dropdown';
import { CommentItemComponent } from '../comment-item/comment-item';
import { ImageCarouselComponent } from '../image-carousel/image-carousel';
import { PetReport } from '../../../core/models/pet.model';
import { Comentario } from '../../../core/models/comment.model';
import { CommentService } from '../../../core/services/comment.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PetService } from '../../../core/services/pet.service';

@Component({
  selector: 'app-post-card-social',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AvatarComponent,
    BadgeComponent,
    OptionsDropdownComponent,
    CommentItemComponent,
    ImageCarouselComponent
  ],
  templateUrl: './post-card-social.html',
  styleUrl: './post-card-social.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostCardSocialComponent {
  private readonly commentService = inject(CommentService);
  private readonly authService = inject(AuthService);
  private readonly petService = inject(PetService);
  private readonly router = inject(Router);

  // Inputs y Outputs
  report = input.required<PetReport>();
  reportChange = output<PetReport>();
  flagPost = output<PetReport>();

  // Estado Sesión
  usuario = this.authService.usuario;

  // Estado Local de Comentarios
  openComments = signal<boolean>(false);
  comments = signal<Comentario[]>([]);
  isLoadingComments = signal<boolean>(false);
  isSendingComment = signal<boolean>(false);
  commentInput = signal<string>('');
  
  // Conteo local reactivo para comentarios
  localCommentCount = signal<number | null>(null);

  // Conteo visible de comentarios reactivo e inmutable
  displayCommentCount = computed(() =>
    this.localCommentCount() !== null
      ? this.localCommentCount()!
      : (this.report().total_comentarios || 0)
  );

  // Hilo de Respuestas
  replyingToId = signal<string | null>(null);
  replyInput = signal<string>('');
  sendingReplySet = signal<Set<string>>(new Set());

  // Likes e interactividad de comentarios
  commentLikedSet = signal<Set<string>>(new Set());
  commentLikeCounts = signal<Record<string, number>>({});

  // Opciones de menú
  readonly REPORT_OPTIONS = [
    { label: 'Denunciar publicación', icon: 'flag', value: 'report', danger: true }
  ];

  // Métodos de visualización
  get formattedLocation(): string {
    const loc = this.report().ubicacion;
    if (!loc) return '';

    const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
    const cleanedParts = parts.filter(p => {
      const lower = p.toLowerCase();
      if (lower === 'perú' || lower === 'peru') return false;
      if (/^\d+$/.test(lower)) return false;
      return true;
    });

    if (cleanedParts.length > 3) {
      return cleanedParts.slice(0, 3).join(', ');
    }
    return cleanedParts.join(', ');
  }

  getTimeAgo(creado_en: string): string {
    if (!creado_en) return '';
    const diff = Date.now() - new Date(creado_en).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `Hace ${mins}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  }

  getImages(): string[] {
    const r = this.report();
    const urls: string[] = [];
    if (r.imagen_principal?.url) {
      urls.push(r.imagen_principal.url);
    }
    if (r.imagenes && r.imagenes.length) {
      r.imagenes.forEach(img => {
        if (img.url && img.url !== r.imagen_principal?.url) {
          urls.push(img.url);
        }
      });
    }
    if (urls.length === 0) {
      urls.push('/images/pet-max.png');
    }
    return urls;
  }

  // UI Handlers de publicación principal
  // Likes
  async onLikeClick(): Promise<void> {
    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const reportVal = this.report();
    const oldLiked = reportVal.liked_por_usuario;
    const oldTotal = reportVal.total_likes || 0;

    // Actualización optimista local
    const optimisticReport: PetReport = {
      ...reportVal,
      liked_por_usuario: !oldLiked,
      total_likes: oldLiked ? Math.max(0, oldTotal - 1) : oldTotal + 1
    };
    this.reportChange.emit(optimisticReport);

    try {
      const res = await this.petService.toggleLike(reportVal.id_reporte_mascota!);
      const finalReport: PetReport = {
        ...reportVal,
        liked_por_usuario: res.liked_por_usuario,
        total_likes: res.total_likes
      };
      this.reportChange.emit(finalReport);
    } catch (err) {
      console.error('Error al alternar me gusta:', err);
      // Revertir
      const revertReport: PetReport = {
        ...reportVal,
        liked_por_usuario: oldLiked,
        total_likes: oldTotal
      };
      this.reportChange.emit(revertReport);
    }
  }

  // Compartir (Repost)
  async onShareClick(event: Event): Promise<void> {
    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const reportVal = this.report();
    const yaCompartido = reportVal.esta_compartido;
    const totalComp = reportVal.total_compartidos ?? 0;

    // Actualización optimista local
    const optimisticReport: PetReport = {
      ...reportVal,
      esta_compartido: !yaCompartido,
      total_compartidos: yaCompartido ? Math.max(0, totalComp - 1) : totalComp + 1
    };
    this.reportChange.emit(optimisticReport);

    try {
      if (yaCompartido) {
        await this.petService.descompartirReporte(reportVal.id_reporte_mascota!);
        const finalReport: PetReport = {
          ...reportVal,
          esta_compartido: false,
          total_compartidos: Math.max(0, totalComp - 1)
        };
        this.reportChange.emit(finalReport);
      } else {
        await this.petService.compartirReporte(reportVal.id_reporte_mascota!);
        const finalReport: PetReport = {
          ...reportVal,
          esta_compartido: true,
          total_compartidos: totalComp + 1
        };
        this.reportChange.emit(finalReport);
      }
    } catch (err) {
      console.error('Error al registrar compartición:', err);
      // Revertir
      const revertReport: PetReport = {
        ...reportVal,
        esta_compartido: yaCompartido,
        total_compartidos: totalComp
      };
      this.reportChange.emit(revertReport);
    }
  }

  onReportOptionSelected(option: any): void {
    if (option.value === 'report') {
      this.flagPost.emit(this.report());
    }
  }

  // --- LÓGICA DE COMENTARIOS ---

  toggleComments(): void {
    const nextState = !this.openComments();
    this.openComments.set(nextState);
    if (nextState && this.comments().length === 0) {
      this.loadComments();
    }
  }

  async loadComments(): Promise<void> {
    const reportId = this.report().id_reporte_mascota;
    if (!reportId) return;

    this.isLoadingComments.set(true);
    try {
      const list = await this.commentService.getComments(reportId);
      this.comments.set(list);
      this.syncCommentLikesRecursive(list);
    } catch (err) {
      console.error('Error al cargar comentarios en la tarjeta:', err);
    } finally {
      this.isLoadingComments.set(false);
    }
  }

  updateCommentInput(text: string): void {
    this.commentInput.set(text);
  }

  async onSendComment(): Promise<void> {
    const text = this.commentInput().trim();
    const reportId = this.report().id_reporte_mascota;
    if (!text || !reportId) return;

    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.isSendingComment.set(true);
    try {
      const newComment = await this.commentService.addComment(reportId, text);
      
      // Insertar localmente
      this.comments.update(list => [newComment, ...list]);
      
      // Inicializar contador de likes
      if (newComment.id_comentario) {
        this.commentLikeCounts.update(prev => ({
          ...prev,
          [newComment.id_comentario!]: 0
        }));
      }

      this.commentInput.set('');

      // Incrementar contador de comentarios en la UI
      this.incrementarContadorComentarios(1);
    } catch (err) {
      console.error('Error al enviar comentario:', err);
    } finally {
      this.isSendingComment.set(false);
    }
  }

  // Hilos de respuestas
  startReply(commentId: string): void {
    this.replyingToId.set(commentId);
    this.replyInput.set('');
  }

  cancelReply(): void {
    this.replyingToId.set(null);
    this.replyInput.set('');
  }

  updateReplyInput(text: string): void {
    this.replyInput.set(text);
  }

  async onSendReply(event: { text: string; parentId: string }): Promise<void> {
    const text = event.text.trim();
    const reportId = this.report().id_reporte_mascota;
    if (!text || !reportId) return;

    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.sendingReplySet.update(s => {
      const copy = new Set(s);
      copy.add(event.parentId);
      return copy;
    });

    try {
      const newReply = await this.commentService.reply(reportId, event.parentId, text);
      
      // Agregar localmente la respuesta de forma recursiva
      this.comments.update(list => this.addReplyToParentRecursive(list, event.parentId, newReply));

      // Inicializar contador de likes
      if (newReply.id_comentario) {
        this.commentLikeCounts.update(prev => ({
          ...prev,
          [newReply.id_comentario!]: 0
        }));
      }

      this.cancelReply();
      this.incrementarContadorComentarios(1);
    } catch (err) {
      console.error('Error al responder comentario:', err);
    } finally {
      this.sendingReplySet.update(s => {
        const copy = new Set(s);
        copy.delete(event.parentId);
        return copy;
      });
    }
  }

  async onToggleCommentLike(commentId: string): Promise<void> {
    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    // Optimista
    const oldLiked = this.commentLikedSet().has(commentId);
    const oldTotal = this.commentLikeCounts()[commentId] || 0;

    this.commentLikedSet.update(set => {
      const copy = new Set(set);
      if (oldLiked) copy.delete(commentId);
      else copy.add(commentId);
      return copy;
    });
    this.commentLikeCounts.update(prev => ({
      ...prev,
      [commentId]: oldLiked ? Math.max(0, oldTotal - 1) : oldTotal + 1
    }));

    try {
      const res = await this.commentService.toggleCommentLike(commentId);
      this.commentLikeCounts.update(prev => ({ ...prev, [commentId]: res.total }));
      this.commentLikedSet.update(set => {
        const copy = new Set(set);
        if (res.liked) copy.add(commentId);
        else copy.delete(commentId);
        return copy;
      });
    } catch (err) {
      console.error('Error al dar like al comentario:', err);
      // Revertir
      this.commentLikedSet.update(set => {
        const copy = new Set(set);
        if (oldLiked) copy.add(commentId);
        else copy.delete(commentId);
        return copy;
      });
      this.commentLikeCounts.update(prev => ({ ...prev, [commentId]: oldTotal }));
    }
  }

  async onDeleteComment(commentId: string): Promise<void> {
    const reportId = this.report().id_reporte_mascota;
    if (!reportId) return;

    if (!confirm('¿Estás seguro de que deseas eliminar este comentario?')) return;

    try {
      await this.commentService.deleteComment(reportId, commentId);
      
      // Remover de la lista local
      this.comments.update(list => this.deleteCommentRecursive(list, commentId));
      this.incrementarContadorComentarios(-1);
    } catch (err) {
      console.error('Error al eliminar comentario:', err);
    }
  }

  // --- MÉTODOS AUXILIARES ---

  private incrementarContadorComentarios(cantidad: number): void {
    const current = this.localCommentCount() ?? this.report().total_comentarios ?? 0;
    const nextCount = Math.max(0, current + cantidad);
    this.localCommentCount.set(nextCount);
    
    // Emitir el cambio del reporte completo modificado de forma inmutable
    const updatedReport: PetReport = {
      ...this.report(),
      total_comentarios: nextCount
    };
    this.reportChange.emit(updatedReport);
  }

  private syncCommentLikesRecursive(comments: Comentario[]): void {
    comments.forEach(c => {
      if (c.id_comentario) {
        this.commentLikeCounts.update(prev => ({
          ...prev,
          [c.id_comentario!]: c.total_likes || 0
        }));
        if (c.is_liked) {
          this.commentLikedSet.update(prev => {
            const copy = new Set(prev);
            copy.add(c.id_comentario!);
            return copy;
          });
        }
      }
      if (c.respuestas && c.respuestas.length > 0) {
        this.syncCommentLikesRecursive(c.respuestas);
      }
    });
  }

  private deleteCommentRecursive(comments: Comentario[], targetId: string): Comentario[] {
    return comments
      .filter(c => c.id_comentario !== targetId)
      .map(c => {
        if (c.respuestas && c.respuestas.length > 0) {
          return {
            ...c,
            respuestas: this.deleteCommentRecursive(c.respuestas, targetId)
          };
        }
        return c;
      });
  }

  private addReplyToParentRecursive(comments: Comentario[], parentId: string, newReply: Comentario): Comentario[] {
    return comments.map(c => {
      if (c.id_comentario === parentId) {
        return {
          ...c,
          respuestas: [...(c.respuestas || []), newReply]
        };
      } else if (c.respuestas && c.respuestas.length > 0) {
        return {
          ...c,
          respuestas: this.addReplyToParentRecursive(c.respuestas, parentId, newReply)
        };
      }
      return c;
    });
  }
}
