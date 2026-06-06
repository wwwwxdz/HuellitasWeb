import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PetService } from '../../../core/services/pet.service';
import { CommentService } from '../../../core/services/comment.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PetReport } from '../../../core/models/pet.model';
import { Comentario } from '../../../core/models/comment.model';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { MapComponent } from '../components/map-component/map-component';
import { ImageCarouselComponent } from '../../../shared/components/image-carousel/image-carousel';
import { CommentItemComponent } from '../../../shared/components/comment-item/comment-item';
import { ImageViewerComponent } from '../../../shared/components/image-viewer/image-viewer.component';

import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { BadgeComponent } from '../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../shared/components/button/button';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    Navbar,
    Footer,
    MapComponent,
    ImageCarouselComponent,
    CommentItemComponent,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    ImageViewerComponent
  ],
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
  providers: [DatePipe]
})
export class PetDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private petService = inject(PetService);
  private commentService = inject(CommentService);
  private authService = inject(AuthService);

  // Estado
  report = signal<PetReport | null>(null);
  isLoading = signal<boolean>(true);
  activeViewerImage = signal<string | null>(null);
  
  // Sesión
  usuario = this.authService.usuario;

  // Comentarios
  comments = signal<Comentario[]>([]);
  isLoadingComments = signal<boolean>(false);
  sendingComment = signal<boolean>(false);
  commentInput = signal<string>('');
  
  replyingToId = signal<string | null>(null);
  replyInput = signal<string>('');
  sendingReplySet = signal<Set<string>>(new Set());
  
  commentLikedSet = signal<Set<string>>(new Set());
  commentLikeCounts = signal<Record<string, number>>({});

  // Helpers de visualización
  pawPoint = computed(() => {
    const r = this.report();
    if (!r) return [];
    return [{
      id_reporte_mascota: r.id_reporte_mascota,
      nombre: r.nombre,
      estado: r.estado,
      latitud: r.latitud,
      longitud: r.longitud,
      id_especie: r.id_especie || '',
      foto_principal: r.imagen_principal?.url || ''
    }];
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/pets/reports']);
      return;
    }
    this.loadReportDetails(id);
  }

  async loadReportDetails(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.petService.getReporte(id);
      this.report.set(data);
      await this.loadComments(id);
    } catch (err) {
      console.error('Error al cargar detalle de mascota:', err);
      this.router.navigate(['/pets/reports']);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadComments(reporteId: string): Promise<void> {
    this.isLoadingComments.set(true);
    try {
      const list = await this.commentService.getComments(reporteId);
      this.comments.set(list);
      this.syncCommentLikesRecursive(list);
    } catch (err) {
      console.error('Error al cargar comentarios:', err);
    } finally {
      this.isLoadingComments.set(false);
    }
  }

  getImages(report: PetReport): string[] {
    const urls: string[] = [];
    if (report.imagen_principal?.url) {
      urls.push(report.imagen_principal.url);
    }
    if (report.imagenes && report.imagenes.length) {
      report.imagenes.forEach(img => {
        if (img.url && img.url !== report.imagen_principal?.url) {
          urls.push(img.url);
        }
      });
    }
    if (urls.length === 0) {
      urls.push('/images/pet-max.png');
    }
    return urls;
  }

  getStatusLabel(estado: number): 'perdido' | 'avistado' | 'encontrado' | 'reunido' {
    if (estado === 1) return 'encontrado';
    if (estado === 2) return 'perdido';
    if (estado === 3) return 'avistado';
    return 'reunido';
  }

  getStatusClass(estado: number): string {
    if (estado === 1) return 'status-encontrado';
    if (estado === 2) return 'status-perdido';
    if (estado === 3) return 'status-avistado';
    return 'status-reunido';
  }

  // --- LIKES Y COMPARTIR ---
  async toggleLike(): Promise<void> {
    const r = this.report();
    if (!r) return;

    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const oldLiked = r.liked_por_usuario;
    const oldTotal = r.total_likes || 0;

    // Optimista
    this.report.set({
      ...r,
      liked_por_usuario: !oldLiked,
      total_likes: oldLiked ? oldTotal - 1 : oldTotal + 1
    });

    try {
      const res = await this.petService.toggleLike(r.id_reporte_mascota);
      this.report.set({
        ...r,
        liked_por_usuario: res.liked_por_usuario,
        total_likes: res.total_likes
      });
    } catch (err) {
      console.error('Error al dar like:', err);
      // Revertir
      this.report.set({
        ...r,
        liked_por_usuario: oldLiked,
        total_likes: oldTotal
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/pets/reports']);
  }

  // --- INTERACCIÓN DE COMENTARIOS ---

  async onSendComment(): Promise<void> {
    const r = this.report();
    if (!r) return;

    const text = this.commentInput().trim();
    if (!text) return;

    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.sendingComment.set(true);
    try {
      const newComment = await this.commentService.addComment(r.id_reporte_mascota, text);
      this.comments.update(list => [...list, newComment]);
      
      if (newComment.id_comentario) {
        this.commentLikeCounts.update(prev => ({ ...prev, [newComment.id_comentario!]: 0 }));
      }

      this.commentInput.set('');

      // Incrementar contador
      this.report.set({
        ...r,
        total_comentarios: (r.total_comentarios || 0) + 1
      });
    } catch (err) {
      console.error('Error al enviar comentario:', err);
    } finally {
      this.sendingComment.set(false);
    }
  }

  startReply(commentId: string): void {
    this.replyingToId.set(commentId);
    this.replyInput.set('');
  }

  cancelReply(): void {
    this.replyingToId.set(null);
    this.replyInput.set('');
  }

  async onSendReply(event: { text: string; parentId: string }): Promise<void> {
    const r = this.report();
    if (!r) return;

    const text = event.text.trim();
    if (!text) return;

    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.sendingReplySet.update(set => {
      const copy = new Set(set);
      copy.add(event.parentId);
      return copy;
    });

    try {
      const newReply = await this.commentService.reply(r.id_reporte_mascota, event.parentId, text);
      
      this.comments.update(list => this.addReplyToParentRecursive(list, event.parentId, newReply));

      if (newReply.id_comentario) {
        this.commentLikeCounts.update(prev => ({ ...prev, [newReply.id_comentario!]: 0 }));
      }

      this.cancelReply();

      // Incrementar contador
      this.report.set({
        ...r,
        total_comentarios: (r.total_comentarios || 0) + 1
      });
    } catch (err) {
      console.error('Error al responder comentario:', err);
    } finally {
      this.sendingReplySet.update(set => {
        const copy = new Set(set);
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

    const oldLiked = this.commentLikedSet().has(commentId);
    const oldTotal = this.commentLikeCounts()[commentId] || 0;

    // Optimista
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

  async onDeleteComment(event: { reporteId: string; commentId: string }): Promise<void> {
    const r = this.report();
    if (!r) return;

    if (!confirm('¿Estás seguro de que deseas eliminar este comentario?')) return;

    try {
      await this.commentService.deleteComment(event.reporteId, event.commentId);
      this.comments.update(list => this.deleteCommentRecursive(list, event.commentId));

      // Decrementar contador
      this.report.set({
        ...r,
        total_comentarios: Math.max(0, (r.total_comentarios || 0) - 1)
      });
    } catch (err) {
      console.error('Error al eliminar comentario:', err);
    }
  }

  // --- RECURSIVIDAD AUXILIAR ---
  private syncCommentLikesRecursive(comments: Comentario[]): void {
    comments.forEach(c => {
      if (c.id_comentario) {
        this.commentLikeCounts.update(prev => ({ ...prev, [c.id_comentario!]: c.total_likes || 0 }));
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
