import { Component, input, output, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReporteMascotaPuntoMapa } from '../../../../core/models/pet.model';
import { MapComponent } from '../map-component/map-component';

@Component({
  selector: 'app-location-filter-modal',
  standalone: true,
  imports: [FormsModule, MapComponent],
  templateUrl: './location-filter-modal.html'
})
export class LocationFilterModal {
  isOpen = input<boolean>(false);
  initialCenter = input<[number, number]>([-9.1214, -78.5308]);
  initialRadius = input<number>(15);
  reports = input<ReporteMascotaPuntoMapa[]>([]);

  closeModal = output<void>();
  applyFilters = output<{ center: [number, number]; radius: number }>();

  tempCenter = signal<[number, number]>([-9.1214, -78.5308]);
  tempRadius = signal<number>(15);
  private originalCenter: [number, number] = [-9.1214, -78.5308];
  private originalRadius = 15;
  /** Radio que tenía el filtro ANTES de abrir el modal (puede ser 0 si no había filtro activo) */
  private originalRadiusBeforeOpen = 0;

  constructor() {
    // Sincronizar estados temporales cuando el modal se abre y disparar búsqueda inicial
    effect(() => {
      if (this.isOpen()) {
        const centerVal = this.initialCenter();
        const radiusVal = this.initialRadius() || 15;
        this.tempCenter.set(centerVal);
        this.tempRadius.set(radiusVal);
        this.originalCenter = [...centerVal] as [number, number];
        this.originalRadius = radiusVal;
        // Guardar el radio REAL antes de abrir (sin el fallback de 15)
        this.originalRadiusBeforeOpen = this.initialRadius() ?? 0;
        // Disparar búsqueda automática al abrir el modal con los valores iniciales
        setTimeout(() => {
          this.applyFilters.emit({ center: centerVal, radius: radiusVal });
        }, 0);
      }
    });
  }

  handleClose(): void {
    this.closeModal.emit();
  }

  handleCancel(): void {
    // Restaurar al estado previo a la apertura del modal
    this.applyFilters.emit({
      center: this.originalCenter,
      radius: this.originalRadiusBeforeOpen
    });
    this.handleClose();
  }

  handleApply(): void {
    // Los filtros ya se aplicaron en tiempo real, solo cerramos el modal
    this.handleClose();
  }

  updateTempCenter(coords: [number, number]): void {
    this.tempCenter.set(coords);
    this.applyFilters.emit({
      center: coords,
      radius: this.tempRadius()
    });
  }

  updateTempRadius(radius: number): void {
    this.tempRadius.set(radius);
    this.applyFilters.emit({
      center: this.tempCenter(),
      radius: radius
    });
  }
}
