import { Component, OnInit, inject, input, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommentService } from '../../../../../core/services/comment.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { Comentario } from '../../../../../core/models/comment.model';
import { CommentItemComponent } from '../../../../../shared/components/comment-item/comment-item';
import { ButtonComponent } from '../../../../../shared/components/button/button';

@Component({
  selector: 'app-pet-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, CommentItemComponent, ButtonComponent],
  templateUrl: './pet-comments.html',
  styleUrl: './pet-comments.scss'
})
export class PetCommentsComponent implements OnInit {
  private readonly commentService = inject(CommentService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Inputs
  reporteId = input.required<string>();

  // Outputs
  @Output() reportComment = new EventEmitter<Comentario>();

  // Sesión
  usuario = this.authService.usuario;

  // Estado
  comments = signal<Comentario[]>([]);
  isLoadingComments = signal<boolean>(false);
  sendingComment = signal<boolean>(false);
  commentInput = signal<string>('');

  replyingToId = signal<string | null>(null);
  replyInput = signal<string>('');
  sendingReplySet = signal<Set<string>>(new Set());

  commentLikedSet = signal<Set<string>>(new Set());
  commentLikeCounts = signal<Record<string, number>>({});

  ngOnInit(): void {
    const id = this.reporteId();
    if (id) {
      this.loadComments(id);
    }
  }

  async loadComments(reporteId: string): Promise<void> {
    this.isLoadingComments.set(true);
    try {
      const list = await this.commentService.getComments(reporteId);
      this.comments.set(list || []);
      this.syncCommentLikesRecursive(list);
    } catch (err) {
      console.error('Error al cargar comentarios:', err);
      this.comments.set([]);
    } finally {
      this.isLoadingComments.set(false);
    }
  }

  async onSendComment(): Promise<void> {
    const id = this.reporteId();
    if (!id) return;

    const text = this.commentInput().trim();
    if (!text) return;

    if (!this.usuario()) {
      this.authService.openAuthModal();
      return;
    }

    this.sendingComment.set(true);
    try {
      const newComment = await this.commentService.addComment(id, text);
      this.comments.update(list => [...list, newComment]);
      
      if (newComment.id_comentario) {
        this.commentLikeCounts.update(prev => ({ ...prev, [newComment.id_comentario!]: 0 }));
      }

      this.commentInput.set('');
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
    const id = this.reporteId();
    if (!id) return;

    const text = event.text.trim();
    if (!text) return;

    if (!this.usuario()) {
      this.authService.openAuthModal();
      return;
    }

    this.sendingReplySet.update(set => {
      const copy = new Set(set);
      copy.add(event.parentId);
      return copy;
    });

    try {
      const newReply = await this.commentService.reply(id, event.parentId, text);
      
      this.comments.update(list => this.addReplyToParentRecursive(list, event.parentId, newReply));

      if (newReply.id_comentario) {
        this.commentLikeCounts.update(prev => ({ ...prev, [newReply.id_comentario!]: 0 }));
      }

      this.cancelReply();
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
      this.authService.openAuthModal();
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
      this.commentLikedSet.update(set => {
        const copy = new Set(set);
        if (res.liked) copy.add(commentId);
        else copy.delete(commentId);
        return copy;
      });
      this.commentLikeCounts.update(prev => ({
        ...prev,
        [commentId]: res.total
      }));
    } catch (error) {
      console.error('Error al dar like a comentario:', error);
      // Revertir
      this.commentLikedSet.update(set => {
        const copy = new Set(set);
        if (oldLiked) copy.add(commentId);
        else copy.delete(commentId);
        return copy;
      });
      this.commentLikeCounts.update(prev => ({
        ...prev,
        [commentId]: oldTotal
      }));
    }
  }

  async onDeleteComment(event: { reporteId: string; commentId: string }): Promise<void> {
    if (confirm('¿Estás seguro de eliminar este comentario?')) {
      try {
        await this.commentService.deleteComment(event.reporteId, event.commentId);
        this.comments.update(list => this.deleteCommentRecursive(list, event.commentId));
      } catch (err) {
        console.error('Error al eliminar comentario:', err);
      }
    }
  }

  private syncCommentLikesRecursive(comments: Comentario[]): void {
    if (!comments) return;
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

  private addReplyToParentRecursive(comments: Comentario[], parentId: string, reply: Comentario): Comentario[] {
    return comments.map(c => {
      if (c.id_comentario === parentId) {
        return {
          ...c,
          respuestas: [...(c.respuestas || []), reply]
        };
      } else if (c.respuestas && c.respuestas.length > 0) {
        return {
          ...c,
          respuestas: this.addReplyToParentRecursive(c.respuestas, parentId, reply)
        };
      }
      return c;
    });
  }
}
