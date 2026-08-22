import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.html',
  styleUrl: './button.scss',
  host: {
    '[class.btn-block]': 'fullWidth()',
  }
})
export class ButtonComponent {
  variant = input<'primary' | 'outline' | 'secondary' | 'danger' | 'text' | 'success' | 'red'>('primary');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  size = input<'sm' | 'md' | 'lg'>('md');
  shape = input<'rounded' | 'pill'>('pill');
  fullWidth = input<boolean>(false);

  // Mantenemos soporte opcional heredado por si acaso
  icon = input<string | undefined>(undefined);
  iconPosition = input<'left' | 'right'>('left');

  btnClick = output<MouseEvent>();

  onClick(event: MouseEvent) {
    if (!this.disabled() && !this.loading()) {
      this.btnClick.emit(event);
    }
  }
}
