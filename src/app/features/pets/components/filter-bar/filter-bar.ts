import { Component, input, model, computed, output } from '@angular/core';
import { Especie } from '../../../../core/models/pet.model';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss'
})
export class FilterBar {
  especies = input<Especie[]>([]);
  showRewardOption = input<boolean>(true);

  // Modelos bidireccionales con Signals
  selectedEspecieId = model<string>(''); // '', id_perro, id_gato, o 'otros'
  selectedOrder = model<'recent' | 'oldest'>('recent');
  withReward = model<boolean>(false);
  radio = model<number>(0);

  // Evento para abrir el modal del mapa
  openMap = output<void>();

  // Detección computada de las especies perro y gato
  perroEspecie = computed(() => {
    return this.especies().find(e => 
      e.nombre.toLowerCase().includes('perro') || 
      e.nombre.toLowerCase().includes('can')
    );
  });

  gatoEspecie = computed(() => {
    return this.especies().find(e => 
      e.nombre.toLowerCase().includes('gato') || 
      e.nombre.toLowerCase().includes('felin')
    );
  });

  selectCategory(category: 'all' | 'perro' | 'gato' | 'otros'): void {
    if (category === 'all') {
      this.selectedEspecieId.set('');
    } else if (category === 'perro') {
      const p = this.perroEspecie();
      this.selectedEspecieId.set(p ? p.id_especie : '');
    } else if (category === 'gato') {
      const g = this.gatoEspecie();
      this.selectedEspecieId.set(g ? g.id_especie : '');
    } else if (category === 'otros') {
      this.selectedEspecieId.set('otros');
    }
  }

  toggleReward(): void {
    this.withReward.update(v => !v);
  }

  toggleNearby(): void {
    if (this.radio() > 0) {
      this.radio.set(0);
    } else {
      this.openMap.emit();
    }
  }
}
