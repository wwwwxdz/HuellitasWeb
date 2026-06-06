import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { FilterBar } from '../components/filter-bar/filter-bar';
import { SideFilters, FilterValues } from '../components/side-filters/side-filters';
import { PetCard } from '../components/pet-card/pet-card';
import { LocationFilterModal } from '../components/location-filter-modal/location-filter-modal';
import { MapComponent } from '../components/map-component/map-component';
import { PetService } from '../../../core/services/pet.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserService } from '../../../core/services/user.service';
import { PetReport, Especie, ReporteMascotaPuntoMapa } from '../../../core/models/pet.model';

@Component({
  selector: 'app-lost',
  standalone: true,
  imports: [Navbar, FilterBar, SideFilters, PetCard, LocationFilterModal, MapComponent],
  templateUrl: './lost.html',
  styleUrl: './lost.scss'
})
export class LostComponent implements OnInit, OnDestroy {
  private readonly petService = inject(PetService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  // Signals de Datos y Estado
  reports = signal<PetReport[]>([]);
  loading = signal<boolean>(true);
  loadingMore = signal<boolean>(false);
  error = signal<string | null>(null);
  page = signal<number>(1);
  hasMore = signal<boolean>(false);
  totalResults = signal<number>(0);
  isMapModalOpen = signal<boolean>(false);
  especies = signal<Especie[]>([]);

  center = signal<[number, number]>([-9.1214, -78.5308]); // Nuevo Chimbote
  initialLocationLoaded = signal<boolean>(false);
  mapPoints = signal<ReporteMascotaPuntoMapa[]>([]);

  // Señales individuales para la barra de filtros rápidos
  selectedEspecieId = signal<string>('');
  selectedOrder = signal<'recent' | 'oldest'>('recent');
  withRewardFilter = signal<boolean>(false);
  radioFilter = signal<number>(0);

  // Señal consolidada para la barra lateral y filtrado avanzado
  advancedFilters = signal<FilterValues>({
    search: '',
    id_especie: '',
    id_raza: '',
    radio: 0,
    withReward: false
  });

  constructor() {
    // Sincronización bidireccional entre la barra lateral (advancedFilters) y las señales de la barra de filtros
    effect(() => {
      const adv = this.advancedFilters();
      
      if (this.selectedEspecieId() !== adv.id_especie) {
        this.selectedEspecieId.set(adv.id_especie || '');
      }
      if (this.radioFilter() !== adv.radio) {
        this.radioFilter.set(adv.radio || 0);
      }
      if (this.withRewardFilter() !== adv.withReward) {
        this.withRewardFilter.set(adv.withReward || false);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const esp = this.selectedEspecieId();
      const rad = this.radioFilter();
      const rew = this.withRewardFilter();

      this.advancedFilters.update(prev => {
        if (prev.id_especie === esp && prev.radio === rad && prev.withReward === rew) {
          return prev;
        }
        return {
          ...prev,
          id_especie: esp,
          radio: rad,
          withReward: rew
        };
      });
    }, { allowSignalWrites: true });

    // Escuchar cualquier cambio en los filtros y volver a consultar la página 1
    effect(() => {
      if (!this.initialLocationLoaded()) {
        return;
      }
      
      // Suscribirse de manera reactiva a los cambios
      this.selectedEspecieId();
      this.selectedOrder();
      this.radioFilter();
      this.withRewardFilter();
      const adv = this.advancedFilters();

      this.page.set(1);
      this.fetchReports(adv, 1, false);
      this.fetchMapPoints(adv);
    }, { allowSignalWrites: true });
  }

  async ngOnInit(): Promise<void> {
    this.loadEspecies();
    await this.cargarUbicacionInicial();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('pet-report-created', this.handleReportCreated);
    }
  }

  async cargarUbicacionInicial(): Promise<void> {
    try {
      if (this.authService.isLoggedIn()) {
        const pref = await this.userService.getGeoPreferences();
        if (pref && typeof pref.lat === 'number' && typeof pref.lng === 'number') {
          this.center.set([pref.lat, pref.lng]);
          if (pref.radio_km && pref.radio_km > 0) {
            this.radioFilter.set(pref.radio_km);
            this.advancedFilters.update((prev) => ({
              ...prev,
              radio: pref.radio_km
            }));
          }
          return;
        }
      }
      await this.obtenerUbicacionActual();
    } catch (err) {
      console.warn('Error al cargar ubicación inicial:', err);
    } finally {
      this.initialLocationLoaded.set(true);
    }
  }

  obtenerUbicacionActual(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.center.set([pos.coords.latitude, pos.coords.longitude]);
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

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pet-report-created', this.handleReportCreated);
    }
  }

  private handleReportCreated = (): void => {
    this.fetchReports(this.advancedFilters(), 1, false);
  };

  private async loadEspecies(): Promise<void> {
    try {
      const list = await this.petService.getEspecies();
      this.especies.set(list);
    } catch (err) {
      console.error('Error al cargar especies en perdidos:', err);
    }
  }

  async fetchReports(f: FilterValues, pageNum: number, append: boolean): Promise<void> {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
      this.error.set(null);
    }

    try {
      const especieId = this.selectedEspecieId();
      const apiEspecieId = (especieId && especieId !== 'otros') ? especieId : undefined;
      const radioVal = this.radioFilter();

      const response = await this.petService.getReportes({
        search: f.search || undefined,
        id_especie: apiEspecieId,
        id_raza: f.id_raza || undefined,
        lat: radioVal && radioVal > 0 ? this.center()[0] : undefined,
        lng: radioVal && radioVal > 0 ? this.center()[1] : undefined,
        radio: radioVal && radioVal > 0 ? radioVal : undefined,
        page: pageNum,
        limit: 12
      });

      // Filtrar sólo Perdidos (2) y Avistados (3)
      let newData = response.data || [];
      newData = newData.filter(r => r.estado === 2 || r.estado === 3);

      // Filtrar por especie 'Otros' (excluyendo perro y gato)
      if (especieId === 'otros') {
        const perro = this.especies().find(e => e.nombre.toLowerCase().includes('perro') || e.nombre.toLowerCase().includes('can'));
        const gato = this.especies().find(e => e.nombre.toLowerCase().includes('gato') || e.nombre.toLowerCase().includes('felin'));
        newData = newData.filter(r => r.id_especie !== perro?.id_especie && r.id_especie !== gato?.id_especie);
      }

      // Filtrar por recompensa en cliente de forma inteligente
      if (this.withRewardFilter()) {
        newData = newData.filter(r => {
          const c = r.caracteristicas as any;
          const descLower = r.descripcion?.toLowerCase() || '';
          return (c && (c.recompensa || c.has_reward || c.monto_recompensa)) || 
                 descLower.includes('recompensa') || 
                 descLower.includes('ofrezco');
        });
      }

      // Filtrado en cliente por características avanzadas (color, tamaño, collar...)
      newData = this.aplicarFiltrosCaracteristicas(newData, f);

      // Ordenación local
      if (this.selectedOrder() === 'recent') {
        newData.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
      } else {
        newData.sort((a, b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime());
      }

      this.hasMore.set(response.hasMore);
      this.totalResults.set(newData.length);

      if (append) {
        this.reports.update((prev) => this.deduplicar([...prev, ...newData]));
      } else {
        this.reports.set(this.deduplicar(newData));
      }
    } catch (err) {
      console.error('Error al obtener reportes:', err);
      this.error.set('No se pudieron cargar los reportes. Verifica tu conexión.');
    } finally {
      this.loading.set(false);
      this.loadingMore.set(false);
    }
  }

  handleFiltersApply(newFilters: FilterValues): void {
    this.advancedFilters.set(newFilters);
  }

  handleLoadMore(): void {
    const nextPage = this.page() + 1;
    this.page.set(nextPage);
    this.fetchReports(this.advancedFilters(), nextPage, true);
  }

  handleMapFilterApply(event: { center: [number, number]; radius: number }): void {
    this.center.set(event.center);
    this.radioFilter.set(event.radius);
  }

  openMapFilter(): void {
    this.isMapModalOpen.set(true);
  }

  closeMapFilter(): void {
    this.isMapModalOpen.set(false);
  }

  getStatusLabel(estado: number): 'perdido' | 'avistado' | 'encontrado' {
    if (estado === 2) return 'perdido';
    if (estado === 3) return 'avistado';
    return 'encontrado';
  }

  getTimeAgo(creado_en: string): string {
    const diff = Date.now() - new Date(creado_en).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `Hace ${mins}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  }

  getTags(r: PetReport): string[] {
    return [r.raza, r.tipo].filter(Boolean);
  }

  async fetchMapPoints(f: FilterValues): Promise<void> {
    try {
      const especieId = this.selectedEspecieId();
      const apiEspecieId = (especieId && especieId !== 'otros') ? especieId : undefined;
      const radioVal = this.radioFilter();

      const response = await this.petService.getMapPoints({
        lat: this.center()[0],
        lng: this.center()[1],
        radio: radioVal && radioVal > 0 ? radioVal : undefined,
        id_especie: apiEspecieId
      });
      
      let pts = response.data || [];
      pts = pts.filter((p) => p.estado === 2 || p.estado === 3);

      if (especieId === 'otros') {
        const perro = this.especies().find(e => e.nombre.toLowerCase().includes('perro') || e.nombre.toLowerCase().includes('can'));
        const gato = this.especies().find(e => e.nombre.toLowerCase().includes('gato') || e.nombre.toLowerCase().includes('felin'));
        pts = pts.filter(p => p.id_especie !== perro?.id_especie && p.id_especie !== gato?.id_especie);
      }

      this.mapPoints.set(pts);
    } catch (err) {
      console.error('Error al cargar puntos del mapa en perdidos:', err);
    }
  }

  private deduplicar(list: PetReport[]): PetReport[] {
    const seen = new Set<string>();
    return list.filter(r => {
      if (seen.has(r.id_reporte_mascota)) return false;
      seen.add(r.id_reporte_mascota);
      return true;
    });
  }

  private aplicarFiltrosCaracteristicas(list: PetReport[], f: FilterValues): PetReport[] {
    return list.filter(r => {
      const c = r.caracteristicas;
      if (f.color && c?.color?.toLowerCase() !== f.color.toLowerCase()) return false;
      if (f.color_secundario && c?.color_secundario?.toLowerCase() !== f.color_secundario.toLowerCase()) return false;
      if (f.tamano && c?.tamano?.toLowerCase() !== f.tamano.toLowerCase()) return false;
      if (f.pelo && c?.pelo?.toLowerCase() !== f.pelo.toLowerCase()) return false;
      if (f.collar === 'si' && !c?.collar) return false;
      if (f.collar === 'no' && c?.collar) return false;
      return true;
    });
  }
}
