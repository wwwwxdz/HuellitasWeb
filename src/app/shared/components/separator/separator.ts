import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-separator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './separator.html',
  styleUrl: './separator.scss',
})
export class SeparatorComponent {
  margin = input<string>('0');
  color = input<string>('rgba(255, 255, 255, 0.4)');
}
