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
  /** Indica si el filtro geográfico ya estaba activo antes de abrir el modal */
  initialActive = input<boolean>(false);
  reports = input<ReporteMascotaPuntoMapa[]>([]);

  closeModal = output<void>();
  /** Emite { center, radius, active }
   * active=true  → aplicar filtro geográfico
   * active=false → cancelar filtro geográfico */
  applyFilters = output<{ center: [number, number]; radius: number; active: boolean }>();

  tempCenter = signal<[number, number]>([-9.1214, -78.5308]);
  tempRadius = signal<number>(15);

  /** Centro y radio que había ANTES de abrir el modal (para restaurar al cancelar) */
  private snapshotCenter: [number, number] = [-9.1214, -78.5308];
  private snapshotRadius = 0;
  private snapshotActive = false;

  constructor() {
    // Al abrir el modal: tomar snapshot del estado previo e inicializar valores temporales
    effect(() => {
      if (this.isOpen()) {
        const centerVal = this.initialCenter();
        const radiusVal = this.initialRadius() > 0 ? this.initialRadius() : 15;

        // Guardar estado previo para restaurarlo si el usuario cancela
        this.snapshotCenter = [...centerVal] as [number, number];
        this.snapshotRadius = this.initialRadius();
        this.snapshotActive = this.initialActive(); // ← usa el input dedicado

        // Inicializar los valores temporales del mapa
        this.tempCenter.set(centerVal);
        this.tempRadius.set(radiusVal);
        // NO emitir aqui: el filtro solo se activa cuando el usuario interactúa con el mapa
      }
    });
  }

  handleClose(): void {
    this.closeModal.emit();
  }

  /** Cancelar: restaurar el estado anterior a la apertura del modal */
  handleCancel(): void {
    this.applyFilters.emit({
      center: this.snapshotCenter,
      radius: this.snapshotRadius,
      active: this.snapshotActive
    });
    this.handleClose();
  }

  /** Aplicar: los cambios ya se emitieron en tiempo real, solo cerramos */
  handleApply(): void {
    this.handleClose();
  }

  /** El usuario hizo clic o arrastró el pin en el mapa → actualizar en tiempo real */
  updateTempCenter(coords: [number, number]): void {
    this.tempCenter.set(coords);
    this.applyFilters.emit({
      center: coords,
      radius: this.tempRadius(),
      active: true
    });
  }

  /** El usuario movió el slider de radio → actualizar en tiempo real */
  updateTempRadius(radius: number): void {
    this.tempRadius.set(radius);
    this.applyFilters.emit({
      center: this.tempCenter(),
      radius: radius,
      active: true
    });
  }
}
