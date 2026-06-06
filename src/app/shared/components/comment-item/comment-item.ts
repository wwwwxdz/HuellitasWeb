import { Component, input, output, model, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Comentario } from '../../../core/models/comment.model';
import { AuthService } from '../../../core/auth/auth.service';

import { AvatarComponent } from '../avatar/avatar';

@Component({
  selector: 'app-comment-item',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    AvatarComponent,
    // Importación recursiva en standalone para las respuestas
    CommentItemComponent
  ],
  templateUrl: './comment-item.html',
  styleUrl: './comment-item.scss'
})
export class CommentItemComponent {
  // Inputs
  comment = input.required<Comentario>();
  reporteId = input.required<string>();
  depth = input<number>(0);
  commentLiked = input<Set<string>>(new Set<string>());
  commentLikeCounts = input<Record<string, number>>({});
  replyingToId = input<string | null>(null);
  sendingSet = input<Set<string>>(new Set<string>());

  // Model para la respuesta bidireccional
  replyInput = model<string>('');

  // Servicios
  private authService = inject(AuthService);

  // Computed
  isSending = computed(() => this.sendingSet().has(this.comment().id_comentario || ''));
  
  canDelete = computed(() => {
    const user = this.authService.usuario();
    if (!user) return false;

    const isAdminOrMod = user.role?.slug === 'admin' || user.role?.slug === 'moderador';
    const isOwner = user.id_usuario === this.comment().usuario?.id_usuario;

    return isAdminOrMod || isOwner;
  });

  // Outputs
  deleteComment = output<{ reporteId: string; commentId: string }>();
  toggleLike = output<string>();
  startReply = output<string>();
  cancelReply = output<void>();
  sendReply = output<{ text: string; parentId: string }>();

  // Handlers
  onDelete(): void {
    if (this.comment().id_comentario) {
      this.deleteComment.emit({
        reporteId: this.reporteId(),
        commentId: this.comment().id_comentario!
      });
    }
  }

  onSendReply(): void {
    const text = this.replyInput().trim();
    if (text && this.comment().id_comentario) {
      this.sendReply.emit({
        text,
        parentId: this.comment().id_comentario!
      });
    }
  }

  getTimeAgo(creado_en: string | Date): string {
    if (!creado_en) return '';
    const diff = Date.now() - new Date(creado_en).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `Hace ${mins}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  }
}
