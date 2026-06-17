import { Component, input, model, output, inject, computed } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Especie } from '../../../../core/models/pet.model';
import { Select, SelectOption } from '../../../../shared/components/select/select';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [Select],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss'
})
export class FilterBar {
  private readonly sanitizer = inject(DomSanitizer);

  especies = input<Especie[]>([]);
  showRewardOption = input<boolean>(true);
  /** Indica si el filtro geográfico está activo (para mostrar el botón activo) */
  geoActive = input<boolean>(false);

  // Modelos bidireccionales con Signals
  selectedEspecieId = model<string>(''); // '', id_perro, id_gato, o 'otros'
  selectedOrder = model<'asc' | 'desc'>('desc');
  withReward = model<boolean>(false);
  radio = model<number>(0);

  // Computed para buscar IDs de Perro y Gato a partir de especies
  idPerro = computed(() => {
    const list = this.especies();
    const p = list.find(e => 
      e.nombre.toLowerCase().includes('perro') || 
      e.nombre.toLowerCase().includes('can') || 
      e.nombre.toLowerCase().includes('dog')
    );
    return p ? p.id_especie : null;
  });

  idGato = computed(() => {
    const list = this.especies();
    const g = list.find(e => 
      e.nombre.toLowerCase().includes('gato') || 
      e.nombre.toLowerCase().includes('felin') || 
      e.nombre.toLowerCase().includes('cat')
    );
    return g ? g.id_especie : null;
  });

  // Evento para abrir el modal del mapa
  openMap = output<void>();
  clearGeo = output<void>();

  /** Opciones para el componente app-select de ordenamiento */
  readonly sortOptions: SelectOption[] = [
    { value: 'desc', label: 'Más recientes' },
    { value: 'asc',  label: 'Más antiguos'  }
  ];

  // SVGs de Lucide optimizados para perro y gato (stroke color hereda del botón activo/inactivo)
  private readonly dogSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.1rem; height: 1.1rem; display: inline-block; vertical-align: middle;">
      <path d="M11.25 16.25h1.5L12 17z" />
      <path d="M16 14v.5" />
      <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309" />
      <path d="M8 14v.5" />
      <path d="M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5" />
    </svg>
  `;

  private readonly catSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.1rem; height: 1.1rem; display: inline-block; vertical-align: middle;">
      <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z" />
      <path d="M8 14v.5" />
      <path d="M16 14v.5" />
      <path d="M11.25 16.25h1.5L12 17l-.75-.75Z" />
    </svg>
  `;

  selectEspecie(id: string): void {
    this.selectedEspecieId.set(id);
  }

  getEspecieSvg(nombre: string): SafeHtml | null {
    const lower = nombre.toLowerCase();
    if (lower.includes('perro') || lower.includes('can')) {
      return this.sanitizer.bypassSecurityTrustHtml(this.dogSvg);
    }
    if (lower.includes('gato') || lower.includes('felin')) {
      return this.sanitizer.bypassSecurityTrustHtml(this.catSvg);
    }
    return null;
  }

  getEspecieFallbackIcon(nombre: string): string {
    const lower = nombre.toLowerCase();
    if (lower.includes('ave') || lower.includes('pajar') || lower.includes('loro')) {
      return 'flutter_dash';
    }
    return 'pets'; // Fallback por defecto (huella)
  }

  toggleReward(): void {
    this.withReward.update(v => !v);
  }
}
