import { Component, OnInit, OnDestroy, inject, signal, effect, untracked, computed } from '@angular/core';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { FilterBar } from '../components/filter-bar/filter-bar';
import { SideFilters, FilterValues } from '../components/side-filters/side-filters';
import { PetCard } from '../components/pet-card/pet-card';
import { LocationFilterModal } from '../components/location-filter-modal/location-filter-modal';
import { MapComponent } from '../components/map-component/map-component';
import { PetService } from '../../../core/services/pet.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserService } from '../../../core/services/user.service';
import { PetReport, Especie } from '../../../core/models/pet.model';

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

  /** Centro actual del mapa (para el mini-map preview) */
  center = signal<[number, number]>([-9.1214, -78.5308]);
  initialLocationLoaded = signal<boolean>(false);
  userRadioLimit = signal<number>(15);

  /**
   * Filtro geográfico unificado — igual al patrón del panel administrativo (PetReportsStore).
   * Se actualiza ATÓMICAMENTE para evitar que el effect se dispare con estados inconsistentes.
   */
  geoFilter = signal<{ lat: number; lng: number; radio: number; active: boolean }>({
    lat: -9.1214,
    lng: -78.5308,
    radio: 15,
    active: false
  });

  // Señales individuales para la barra de filtros rápidos
  selectedEspecieId = signal<string>('');
  selectedOrder = signal<'asc' | 'desc'>('desc'); // 'desc'=más recientes, 'asc'=más antiguos
  withRewardFilter = signal<boolean>(false);
  /** Espejo del radio para el filter-bar (bidireccional). Se sincroniza con geoFilter. */
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
    // Sincronización: advancedFilters → señales de la barra de filtros
    effect(() => {
      const adv = this.advancedFilters();
      if (this.selectedEspecieId() !== adv.id_especie) {
        this.selectedEspecieId.set(adv.id_especie || '');
      }
      if (this.withRewardFilter() !== adv.withReward) {
        this.withRewardFilter.set(adv.withReward || false);
      }
    });

    // Sincronización: señales de filtros → advancedFilters
    effect(() => {
      const esp = this.selectedEspecieId();
      const rew = this.withRewardFilter();

      this.advancedFilters.update(prev => {
        if (prev.id_especie === esp && prev.withReward === rew) return prev;
        return { ...prev, id_especie: esp, withReward: rew };
      });
    });

    // Sincronización: radioFilter (del filter-bar) → geoFilter.radio
    effect(() => {
      const r = this.radioFilter();
      this.geoFilter.update(g => {
        if (g.radio === r) return g;
        return { ...g, radio: r };
      });
    });

    /**
     * Effect principal de consulta.
     * Solo se dispara cuando cambian los filtros de búsqueda O el geoFilter (atómico).
     * El uso de untracked() evita que lecturas internas recreen dependencias innecesarias.
     */
    effect(() => {
      if (!this.initialLocationLoaded()) return;

      // Dependencias reactivas explícitas
      const geo = this.geoFilter();
      const especie = this.selectedEspecieId();
      const order = this.selectedOrder();
      const reward = this.withRewardFilter();
      const adv = this.advancedFilters();

      // Ejecutar la consulta sin leer más señales dentro
      untracked(() => {
        this.page.set(1);
        this.fetchReports(adv, especie, order, reward, geo, 1, false);
      });
    });
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
          this.userRadioLimit.set(pref.radio_km || 15);
          this.geoFilter.set({ lat: pref.lat, lng: pref.lng, radio: pref.radio_km || 15, active: false });
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
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            this.center.set([lat, lng]);
            this.geoFilter.update(g => ({ ...g, lat, lng }));
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
    const geo = this.geoFilter();
    const adv = this.advancedFilters();
    this.fetchReports(adv, this.selectedEspecieId(), this.selectedOrder(), this.withRewardFilter(), geo, 1, false);
  };

  private async loadEspecies(): Promise<void> {
    try {
      const list = await this.petService.getEspecies();
      this.especies.set(list);
    } catch (err) {
      console.error('Error al cargar especies en perdidos:', err);
    }
  }

  async fetchReports(
    f: FilterValues,
    especieId: string,
    order: string,
    withReward: boolean,
    geo: { lat: number; lng: number; radio: number; active: boolean },
    pageNum: number,
    append: boolean
  ): Promise<void> {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
      this.error.set(null);
    }

    try {
      const apiEspecieId = (especieId && especieId !== 'otros') ? especieId : undefined;

      console.info('[LOST FETCH] Parámetros geográficos:', {
        lat: geo.active ? geo.lat : undefined,
        lng: geo.active ? geo.lng : undefined,
        radio: geo.active ? geo.radio : undefined,
        active: geo.active
      });

      const response = await this.petService.getReportes({
        search: f.search || undefined,
        id_especie: apiEspecieId,
        id_raza: f.id_raza || undefined,
        lat: geo.active ? geo.lat : undefined,
        lng: geo.active ? geo.lng : undefined,
        radio: geo.active ? geo.radio : undefined,
        order: order as 'asc' | 'desc',
        page: pageNum,
        limit: 12
      });

      // Filtrar solo Perdidos (2) y Avistados (3)
      let newData = response.data || [];
      newData = newData.filter(r => r.estado === 2 || r.estado === 3);

      // Filtrar por especie 'Otros'
      if (especieId === 'otros') {
        const perro = this.especies().find(e => e.nombre.toLowerCase().includes('perro') || e.nombre.toLowerCase().includes('can'));
        const gato = this.especies().find(e => e.nombre.toLowerCase().includes('gato') || e.nombre.toLowerCase().includes('felin'));
        newData = newData.filter(r => r.id_especie !== perro?.id_especie && r.id_especie !== gato?.id_especie);
      }

      // Filtrar por recompensa
      if (withReward) {
        newData = newData.filter(r => {
          const c = r.caracteristicas as any;
          const descLower = r.descripcion?.toLowerCase() || '';
          return (c && (c.recompensa || c.has_reward || c.monto_recompensa)) ||
                 descLower.includes('recompensa') ||
                 descLower.includes('ofrezco');
        });
      }

      // Filtrado por características avanzadas
      newData = this.aplicarFiltrosCaracteristicas(newData, f);

      // El backend ya ordena por fecha según el parámetro 'order'
      // Solo se aplica sort local si hay filtros de características que redujeron el set

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
    const geo = this.geoFilter();
    this.fetchReports(this.advancedFilters(), this.selectedEspecieId(), this.selectedOrder(), this.withRewardFilter(), geo, nextPage, true);
  }

  /**
   * Recibe el evento del modal del mapa y actualiza el geoFilter ATÓMICAMENTE.
   * Esto garantiza que el effect se dispare una sola vez con el estado completo y correcto.
   */
  handleMapFilterApply(event: { center: [number, number]; radius: number; active: boolean }): void {
    // Actualizar el centro visual del mini-mapa
    this.center.set(event.center);
    // Actualizar el radio en el filter-bar
    this.radioFilter.set(event.active ? event.radius : 0);
    // Actualizar geoFilter de forma atómica — dispara el effect UNA sola vez
    this.geoFilter.set({
      lat: event.center[0],
      lng: event.center[1],
      radio: event.radius,
      active: event.active
    });
  }

  handleClearGeoFilter(): void {
    this.radioFilter.set(0);
    this.geoFilter.set({
      lat: this.center()[0],
      lng: this.center()[1],
      radio: 0,
      active: false
    });
  }

  openMapFilter(): void {
    this.isMapModalOpen.set(true);
  }

  closeMapFilter(): void {
    this.isMapModalOpen.set(false);
  }

  /** Wrapper para el botón Reintentar del template */
  reloadReports(): void {
    const geo = this.geoFilter();
    this.fetchReports(this.advancedFilters(), this.selectedEspecieId(), this.selectedOrder(), this.withRewardFilter(), geo, this.page(), false);
  }

  /** Indica si el filtro geográfico está activo (para el template) */
  geoFilterActive = computed(() => this.geoFilter().active);

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
    if (mins < 1) return 'Hace un momento';
    if (mins < 60) return `Hace ${mins}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  }

  getTags(r: PetReport): string[] {
    return [r.raza, r.tipo].filter(Boolean);
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
