import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.html',
  styleUrl: './button.scss'
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary' | 'danger' | 'outline' | 'text' | 'success'>('primary');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  icon = input<string | undefined>(undefined);
  iconPosition = input<'left' | 'right'>('left');
  size = input<'sm' | 'md' | 'lg'>('md');

  btnClick = output<MouseEvent>();

  onClick(event: MouseEvent) {
    if (!this.disabled() && !this.loading()) {
      this.btnClick.emit(event);
    }
  }
}
