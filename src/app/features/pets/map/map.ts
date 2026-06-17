import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PetService } from '../../../core/services/pet.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserService } from '../../../core/services/user.service';
import { MapComponent as LeafletMapComponent } from '../components/map-component/map-component';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { ReporteMascotaPuntoMapa, PetReport, Especie } from '../../../core/models/pet.model';

@Component({
  selector: 'app-pet-map-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LeafletMapComponent, Navbar, RouterModule],
  templateUrl: './map.html',
  styleUrl: './map.scss',
})
export class MapComponent implements OnInit {
  private readonly petService = inject(PetService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  // Filtros reactivos con Signals
  searchQuery = signal<string>('');
  selectedStatuses = signal<number[]>([1, 2, 3]); // 1=encontrado, 2=perdido, 3=avistado, 4=reunido
  radiusKm = signal<number>(10);
  selectedEspecie = signal<string | null>(null);
  
  // Especies dinámicas del catálogo
  especies = signal<Especie[]>([]);
  idPerro = signal<string | null>(null);
  idGato = signal<string | null>(null);
  
  // Ubicación del mapa
  center = signal<[number, number]>([-9.1214, -78.5308]); // Por defecto Nuevo Chimbote
  zoom = signal<number>(13);

  // Control de carga de ubicación inicial para evitar peticiones duplicadas
  initialLocationLoaded = signal<boolean>(false);

  // Datos cargados de la API
  points = signal<ReporteMascotaPuntoMapa[]>([]);
  resultsList = signal<PetReport[]>([]);
  selectedReport = signal<PetReport | null>(null);

  // Avistamientos simulados para el panel de reportes seleccionado
  sightings = signal<Array<{ id: string; fecha: string; descripcion: string; ubicacion: string }>>([]);

  // Filtrado de puntos basado en los checkboxes de estados
  filteredPoints = computed(() => {
    const statuses = this.selectedStatuses();
    return this.points().filter(pt => statuses.includes(pt.estado));
  });

  constructor() {
    // Escuchar cambios de filtros/ubicación/especie para recargar la data
    effect(async () => {
      if (!this.initialLocationLoaded()) {
        return;
      }

      const lat = this.center()[0];
      const lng = this.center()[1];
      const rad = this.radiusKm();
      const especieFiltro = this.selectedEspecie();
      
      // Determinar qué enviar a la API
      let apiEspecieId: string | undefined = undefined;
      
      if (especieFiltro === this.idPerro()) {
        apiEspecieId = this.idPerro() || undefined;
      } else if (especieFiltro === this.idGato()) {
        apiEspecieId = this.idGato() || undefined;
      } else if (especieFiltro && especieFiltro !== 'otros') {
        apiEspecieId = especieFiltro;
      }
      
      // Cargar marcadores de puntos en el mapa
      const ptsResponse = await this.petService.getMapPoints({
        lat,
        lng,
        radio: rad,
        id_especie: apiEspecieId
      });
      let pts = ptsResponse.data || [];

      // Cargar lista detallada de mascotas en la vecindad
      const reportsResponse = await this.petService.getReportes({
        lat,
        lng,
        radio: rad,
        id_especie: apiEspecieId,
        search: this.searchQuery()
      });
      let reports = reportsResponse.data || [];
      
      // Si el filtro es 'otros', excluir localmente perro y gato
      if (especieFiltro === 'otros') {
        const perroId = this.idPerro();
        const gatoId = this.idGato();
        pts = pts.filter(pt => pt.id_especie !== perroId && pt.id_especie !== gatoId);
        reports = reports.filter(r => r.id_especie !== perroId && r.id_especie !== gatoId);
      }

      this.points.set(pts);
      this.resultsList.set(reports);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.cargarEspecies();
    await this.cargarUbicacionInicial();
  }

  // Cargar catálogo de especies del backend
  async cargarEspecies(): Promise<void> {
    try {
      const listaEspecies = await this.petService.getEspecies();
      this.especies.set(listaEspecies || []);
      
      // Encontrar los IDs de perro y gato
      const perro = listaEspecies.find(e => 
        e.nombre.toLowerCase().includes('perr') || e.nombre.toLowerCase().includes('dog')
      );
      const gato = listaEspecies.find(e => 
        e.nombre.toLowerCase().includes('gat') || e.nombre.toLowerCase().includes('cat')
      );
      
      if (perro) this.idPerro.set(perro.id_especie);
      if (gato) this.idGato.set(gato.id_especie);
    } catch (err) {
      console.warn('Error al cargar catálogo de especies:', err);
    }
  }

  // Cargar ubicación basada en la prioridad de preferencias de usuario
  async cargarUbicacionInicial(): Promise<void> {
    try {
      if (this.authService.isLoggedIn()) {
        const pref = await this.userService.getGeoPreferences();
        if (pref && typeof pref.lat === 'number' && typeof pref.lng === 'number') {
          this.center.set([pref.lat, pref.lng]);
          if (pref.radio_km && pref.radio_km > 0) {
            this.radiusKm.set(pref.radio_km);
          }
          this.zoom.set(13);
          return;
        }
      }

      // Fallback: obtener geolocalización del navegador
      await this.obtenerUbicacionActual();
    } catch (err) {
      console.warn('Error al cargar la ubicación inicial:', err);
    } finally {
      // Marcar como cargado para habilitar las llamadas a la API
      this.initialLocationLoaded.set(true);
    }
  }

  // Obtener geolocalización del navegador si está disponible
  obtenerUbicacionActual(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.center.set([pos.coords.latitude, pos.coords.longitude]);
            this.zoom.set(13);
            resolve();
          },
          (err) => {
            console.warn('Error al obtener la ubicación actual:', err);
            resolve();
          },
          { timeout: 5000 }
        );
      } else {
        resolve();
      }
    });
  }

  // Manejar click en el mapa para recolocar el centro de búsqueda
  onMapClick(coords: [number, number]): void {
    this.center.set(coords);
  }

  // Cargar detalles de un reporte específico al hacer click en su marcador
  async onMarkerClick(idReporte: string): Promise<void> {
    try {
      const report = await this.petService.getReporte(idReporte);
      this.selectedReport.set(report);
      
      // Simular avistamientos para este reporte
      this.sightings.set([
        {
          id: 's1',
          fecha: 'Hace 2 horas',
          descripcion: 'Visto corriendo cerca del parque principal.',
          ubicacion: 'Av. Brasil con Av. Pacifico'
        },
        {
          id: 's2',
          fecha: 'Ayer por la tarde',
          descripcion: 'Buscando comida cerca a un puesto ambulante.',
          ubicacion: 'Cerca al Mercado Buenos Aires'
        }
      ]);
    } catch (error) {
      console.error('Error al cargar reporte:', error);
    }
  }

  // Alternar estados en los checkboxes
  toggleStatus(status: number): void {
    const current = this.selectedStatuses();
    if (current.includes(status)) {
      this.selectedStatuses.set(current.filter(s => s !== status));
    } else {
      this.selectedStatuses.set([...current, status]);
    }
  }

  // Limpiar el reporte seleccionado de la barra lateral derecha
  clearSelectedReport(): void {
    this.selectedReport.set(null);
    this.sightings.set([]);
  }

  // Filtrado rápido de tipo mascota por el navbar flotante
  filtrarPorEspecie(idEspecie: string | null): void {
    this.selectedEspecie.set(idEspecie);
  }

  // Enviar suscripción a alertas en esa zona
  suscribirAlertas(): void {
    alert(`Te has suscrito correctamente a las alertas en un radio de ${this.radiusKm()} km.`);
  }

  getFormattedLocation(loc: string | undefined | null): string {
    if (!loc) return '';

    const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
    const cleanedParts = parts.filter(p => {
      const lower = p.toLowerCase();
      if (lower === 'perú' || lower === 'peru') return false;
      if (/^\d+$/.test(lower)) return false;
      return true;
    });

    if (cleanedParts.length > 3) {
      return cleanedParts.slice(0, 3).join(', ');
    }
    return cleanedParts.join(', ');
  }
}
