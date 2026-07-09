import { Component, input, output, model, inject, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Comentario } from '../../../core/models/comment.model';
import { AuthService } from '../../../core/auth/auth.service';
import { MentionInputDirective } from '../../directives/mention-input.directive';
import { MentionHighlightPipe } from '../../pipes/mention-highlight.pipe';

import { AvatarComponent } from '../avatar/avatar';
import { OptionsDropdownComponent, DropdownOption } from '../options-dropdown/options-dropdown';

@Component({
  selector: 'app-comment-item',
  standalone: true,
  imports: [
    FormsModule,
    AvatarComponent,
    MentionInputDirective,
    MentionHighlightPipe,
    OptionsDropdownComponent,
    CommentItemComponent,
  ],
  templateUrl: './comment-item.html',
  styleUrl: './comment-item.scss',
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

  isOwnComment = computed(() => {
    const user = this.authService.usuario();
    if (!user) return false;
    return user.id_usuario === this.comment().usuario?.id_usuario;
  });

  commentOptions = computed<DropdownOption[]>(() => {
    const options: DropdownOption[] = [];
    if (this.canDelete()) {
      options.push({
        label: 'Eliminar comentario',
        icon: 'delete_outline',
        value: 'delete',
        danger: true,
      });
    }
    if (!this.isOwnComment()) {
      options.push({ label: 'Denunciar comentario', icon: 'flag', value: 'report', danger: true });
    }
    return options;
  });

  // Outputs
  deleteComment = output<{ reporteId: string; commentId: string }>();
  toggleLike = output<string>();
  startReply = output<string>();
  cancelReply = output<void>();
  sendReply = output<{ text: string; parentId: string }>();
  reportComment = output<Comentario>();

  // Handlers
  onOptionSelected(option: DropdownOption): void {
    if (!this.comment().id_comentario) return;

    if (option.value === 'delete') {
      this.deleteComment.emit({
        reporteId: this.reporteId(),
        commentId: this.comment().id_comentario!,
      });
    } else if (option.value === 'report') {
      this.reportComment.emit(this.comment());
    }
  }

  onSendReply(): void {
    const text = this.replyInput().trim();
    if (text && this.comment().id_comentario) {
      this.sendReply.emit({
        text,
        parentId: this.comment().id_comentario!,
      });
    }
  }

  getTimeAgo(creado_en: string | Date): string {
    if (!creado_en) return '';
    const diff = Date.now() - new Date(creado_en).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Hace un momento';
    if (mins < 60) return `Hace ${mins}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  }
}
