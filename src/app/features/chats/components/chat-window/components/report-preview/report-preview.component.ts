import { Component, input, output, model } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Mensaje } from '../../../../../../core/models/chat.model';
import { ModalComponent } from '../../../../../../shared/components/modal/modal';
import { ButtonComponent } from '../../../../../../shared/components/button/button';
import { BadgeComponent } from '../../../../../../shared/components/badge/badge';

@Component({
  selector: 'app-chat-report-preview',
  standalone: true,
  imports: [CommonModule, DatePipe, ModalComponent, ButtonComponent, BadgeComponent],
  templateUrl: './report-preview.component.html',
  styleUrl: './report-preview.component.scss'
})
export class ChatReportPreviewComponent {
  // Modern Signal Inputs
  isOpen = model<boolean>(false);
  message = input<Mensaje | null>(null);

  // Modern Output
  closed = output<void>();
}
