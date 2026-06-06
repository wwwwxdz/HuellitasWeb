import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge.html',
  styleUrl: './badge.scss'
})
export class BadgeComponent {
  status = input.required<number | string>();

  private readonly ESTADOS: Record<string, { label: string; class: string }> = {
    '1': { label: 'Encontrado', class: 'status-encontrado' },
    '2': { label: 'Perdido', class: 'status-perdido' },
    '3': { label: 'Avistado', class: 'status-avistado' },
    '4': { label: 'Reunido', class: 'status-reunido' },
    '5': { label: 'Adopción', class: 'status-adopcion' },
    'encontrado': { label: 'Encontrado', class: 'status-encontrado' },
    'perdido': { label: 'Perdido', class: 'status-perdido' },
    'avistado': { label: 'Avistado', class: 'status-avistado' },
    'reunido': { label: 'Reunido', class: 'status-reunido' },
    'adopcion': { label: 'Adopción', class: 'status-adopcion' }
  };

  label = computed(() => {
    const s = String(this.status()).toLowerCase().trim();
    return this.ESTADOS[s]?.label ?? this.status();
  });

  cssClass = computed(() => {
    const s = String(this.status()).toLowerCase().trim();
    return this.ESTADOS[s]?.class ?? 'status-default';
  });
}
