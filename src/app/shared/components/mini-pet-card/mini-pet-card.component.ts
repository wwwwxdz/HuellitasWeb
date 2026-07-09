import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PetReport } from '../../../core/models/pet.model';

@Component({
  selector: 'app-mini-pet-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mini-pet-card.component.html',
  styleUrl: './mini-pet-card.component.scss',
})
export class MiniPetCardComponent {
  pet = input.required<PetReport>();
  clicked = output<string>();

  onClick(): void {
    this.clicked.emit(this.pet().id_reporte_mascota);
  }

  statusClass = computed(() => {
    const estado = this.pet().estado;
    return estado === 1 ? 'encontrado' : 
           estado === 2 ? 'perdido' : 
           estado === 3 ? 'avistado' : 'reunido';
  });

  statusLabel = computed(() => {
    const estado = this.pet().estado;
    return estado === 1 ? 'Encontrado' : 
           estado === 2 ? 'Perdido' : 
           estado === 3 ? 'Avistado' : 'Reunido';
  });

  formattedLocation = computed(() => {
    const loc = this.pet().ubicacion;
    if (!loc) return '';

    const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
    const cleanedParts = parts.filter(p => {
      const lower = p.toLowerCase();
      if (lower === 'perú' || lower === 'peru') return false;
      if (/^\d+$/.test(lower)) return false;
      return true;
    });

    if (cleanedParts.length > 2) {
      return cleanedParts.slice(0, 2).join(', ');
    }
    return cleanedParts.join(', ');
  });
}
