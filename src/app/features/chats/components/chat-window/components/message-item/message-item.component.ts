import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Mensaje } from '../../../../../../core/models/chat.model';
import { MentionHighlightPipe } from '../../../../../../shared/pipes/mention-highlight.pipe';

@Component({
  selector: 'app-chat-message-item',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule, MentionHighlightPipe],
  providers: [MentionHighlightPipe],
  templateUrl: './message-item.component.html',
  styleUrl: './message-item.component.scss'
})
export class ChatMessageItemComponent {
  // Modern Signal Inputs
  message = input.required<Mensaje>();
  isMine = input<boolean>(false);
  otherAvatar = input<string>('');

  // Modern Output
  previewReport = output<Mensaje>();

  private readonly ESTADO_MAP: Record<number, { label: string; css: string }> = {
    1: { label: 'Encontrado', css: 'encontrado' },
    2: { label: 'Perdido',    css: 'perdido' },
    3: { label: 'Avistado',   css: 'avistado' },
    4: { label: 'Reunido',    css: 'reunido' },
    5: { label: 'Adopción',   css: 'adopcion' },
  };

  getEstadoLabel(e: number | string | undefined): string {
    if (e === undefined) return '';
    return typeof e === 'number' ? (this.ESTADO_MAP[e]?.label ?? '') : (e || '');
  }

  getEstadoCss(e: number | string | undefined): string {
    if (e === undefined) return '';
    return typeof e === 'number' ? (this.ESTADO_MAP[e]?.css ?? '') : (e as string)?.toLowerCase() ?? '';
  }

  onReportClick(): void {
    const msg = this.message();
    if (msg.tipo === 'reporte') {
      this.previewReport.emit(msg);
    }
  }
}
