import { Component, input, output, model } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal';
import { MotivoDenuncia } from '../../../core/models/flag.model';

@Component({
  selector: 'app-flag-modal',
  standalone: true,
  imports: [FormsModule, ModalComponent],
  templateUrl: './flag-modal.html',
  styleUrl: './flag-modal.scss',
})
export class FlagModalComponent {
  isOpen = input<boolean>(false);
  target = input<{ type: string; id: string; label: string } | null>(null);
  isFlagging = input<boolean>(false);

  motivo = model<MotivoDenuncia>('spam');
  descripcion = model<string>('');

  closed = output<void>();
  confirmSubmit = output<void>();

  readonly FLAG_REASONS: { value: MotivoDenuncia; label: string; icon: string }[] = [
    { value: 'spam', label: 'Spam', icon: 'block' },
    { value: 'contenido_inapropiado', label: 'Contenido inapropiado', icon: 'warning' },
    { value: 'informacion_falsa', label: 'Información falsa', icon: 'fact_check' },
    { value: 'acoso', label: 'Acoso', icon: 'report_problem' },
    { value: 'otro', label: 'Otro', icon: 'more_horiz' },
  ];
}
