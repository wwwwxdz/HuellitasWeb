import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PetService } from '../../../core/services/pet.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserService } from '../../../core/services/user.service';
import { MapComponent as LeafletMapComponent } from '../components/map-component/map-component';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { MiniPetCardComponent } from '../../../shared/components/mini-pet-card/mini-pet-card.component';
import { ReporteMascotaPuntoMapa, PetReport, Especie, Avistamiento } from '../../../core/models/pet.model';
import { LocationService, LocationSearchResult } from '../../../core/services/location.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-pet-map-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LeafletMapComponent, Navbar, RouterModule, MiniPetCardComponent],
  templateUrl: './map.html',
  styleUrl: './map.scss',
})
export class MapComponent implements OnInit {
  private readonly petService = inject(PetService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly locationService = inject(LocationService);
  private readonly toastService = inject(ToastService);

  // Filtros reactivos con Signals
  searchQuery = signal<string>('');
  addressQuery = signal<string>('');
  addressSuggestions = signal<LocationSearchResult[]>([]);
  isSearchingAddress = signal<boolean>(false);
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

  // Avistamientos para el panel de reportes seleccionado
  sightings = signal<Avistamiento[]>([]);
  selectedSighting = signal<Avistamiento | null>(null);

  currentUser = this.authService.usuario;

  isOwnReport = computed(() => {
    const report = this.selectedReport();
    const user = this.currentUser();
    if (!report || !user) return false;
    return report.usuario?.id_usuario === user.id_usuario;
  });

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
            this.toastService.show('Ubicación de búsqueda actualizada mediante GPS.', 'success');
            resolve();
          },
          (err) => {
            console.warn('Error al obtener la ubicación actual:', err);
            let msg = 'No se pudo obtener la ubicación actual.';
            if (err.code === 1) {
              msg = 'Permiso de geolocalización denegado.';
            } else if (err.code === 2) {
              msg = 'La ubicación GPS no está disponible.';
            } else if (err.code === 3) {
              msg = 'Tiempo de espera agotado al obtener el GPS.';
            }
            this.toastService.show(msg, 'warning');
            resolve();
          },
          { timeout: 7000 }
        );
      } else {
        this.toastService.show('La geolocalización no está soportada por tu navegador.', 'warning');
        resolve();
      }
    });
  }

  // Buscar dirección o ciudad escrita por el usuario
  async buscarDireccion(): Promise<void> {
    const query = this.addressQuery().trim();
    if (!query) {
      this.toastService.show('Por favor ingresa una dirección o ciudad para buscar.', 'warning');
      return;
    }

    this.isSearchingAddress.set(true);
    try {
      const results = await this.locationService.search(query);
      if (results && results.length > 0) {
        const first = results[0];
        const lat = Number(first.lat);
        const lon = Number(first.lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          this.center.set([lat, lon]);
          this.zoom.set(14);
          this.toastService.show(`Ubicación encontrada: ${first.display_name.split(',')[0]}`, 'success');
        } else {
          this.toastService.show('No se pudieron procesar las coordenadas de la dirección.', 'error');
        }
      } else {
        this.toastService.show('No se encontró ninguna ubicación con esa descripción.', 'warning');
      }
    } catch (err) {
      console.error('Error al buscar dirección:', err);
      this.toastService.show('Ocurrió un error al buscar la dirección.', 'error');
    } finally {
      this.isSearchingAddress.set(false);
    }
  }

  private addressDebounceTimer: any = null;

  // Buscar sugerencias en tiempo real con debounce timer
  onAddressInputChange(query: string): void {
    this.addressQuery.set(query);
    const trimmed = query.trim();
    
    if (this.addressDebounceTimer) {
      clearTimeout(this.addressDebounceTimer);
    }

    if (trimmed.length < 3) {
      this.addressSuggestions.set([]);
      return;
    }

    // Esperar 1.5 segundos a que el usuario termine de escribir antes de consultar
    this.addressDebounceTimer = setTimeout(async () => {
      try {
        const res = await this.locationService.search(trimmed);
        this.addressSuggestions.set(res || []);
      } catch (err) {
        console.error('Error al obtener sugerencias de dirección:', err);
      }
    }, 1500);
  }

  // Seleccionar una dirección de la lista de sugerencias typeahead
  seleccionarSugerencia(suggestion: LocationSearchResult): void {
    const lat = Number(suggestion.lat);
    const lon = Number(suggestion.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      this.center.set([lat, lon]);
      this.zoom.set(14);
      const shortName = suggestion.display_name.split(',')[0];
      this.addressQuery.set(shortName);
      this.toastService.show(`Ubicación seleccionada: ${shortName}`, 'success');
    }
    this.addressSuggestions.set([]);
  }

  // Manejar click en el mapa para recolocar el centro de búsqueda
  onMapClick(coords: [number, number]): void {
    this.center.set(coords);
  }

  // Cargar detalles de un reporte específico al hacer click en su marcador
  async onMarkerClick(idReporte: string): Promise<void> {
    try {
      this.selectedSighting.set(null); // Limpiar avistamiento temporal previo al cambiar de mascota
      const report = await this.petService.getReporte(idReporte);
      this.selectedReport.set(report);
      
      // Cargar avistamientos reales para este reporte llamando al servicio y filtrando los aceptados (estado === 1)
      const sightingsData = await this.petService.getSightings(idReporte);
      const reportSightings = (sightingsData || []).filter(s => s.estado === 1);
      this.sightings.set(reportSightings);
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
    this.selectedSighting.set(null); // Limpiar avistamiento temporal al cerrar el detalle
  }

  // Centrar el mapa en el reporte seleccionado
  centerMapOnReport(): void {
    const report = this.selectedReport();
    if (report && typeof report.latitud === 'number' && typeof report.longitud === 'number') {
      this.center.set([report.latitud, report.longitud]);
      this.zoom.set(15);
    }
  }

  // Centrar el mapa en las coordenadas de un avistamiento específico
  centerMapOnSighting(sighting: Avistamiento): void {
    if (sighting && typeof sighting.latitud === 'number' && typeof sighting.longitud === 'number') {
      this.center.set([sighting.latitud, sighting.longitud]);
      this.zoom.set(15);
    }
  }

  // Alternar el marcador temporal de avistamiento en el mapa
  toggleSightingMarker(sighting: Avistamiento): void {
    const current = this.selectedSighting();
    if (current && current.id_avistamiento === sighting.id_avistamiento) {
      // Si ya está seleccionado, lo desactivamos y removemos el marcador del mapa
      this.selectedSighting.set(null);
    } else {
      // Si no está seleccionado, formamos la ubicación temporal y recentramos la cámara
      this.selectedSighting.set(sighting);
      this.centerMapOnSighting(sighting);
    }
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
