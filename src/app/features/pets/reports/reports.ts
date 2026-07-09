import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  HostListener,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { LocationFilterModal } from '../components/location-filter-modal/location-filter-modal';
import { PetService } from '../../../core/services/pet.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PetReport, Especie } from '../../../core/models/pet.model';
import { MotivoDenuncia } from '../../../core/models/flag.model';
import { PostCardSocialComponent } from '../../../shared/components/post-card-social/post-card-social';
import { Comentario } from '../../../core/models/comment.model';
import { FlagModalComponent } from '../../../shared/components/flag-modal/flag-modal';
import { FlagService } from '../../../core/services/flag.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    Navbar,
    Footer,
    LocationFilterModal,
    FlagModalComponent,
    PostCardSocialComponent,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class ReportsComponent implements OnInit, OnDestroy {
  private readonly petService = inject(PetService);
  private readonly authService = inject(AuthService);
  private readonly flagService = inject(FlagService);
  private readonly router = inject(Router);

  // Sesión
  usuario = this.authService.usuario;

  // Estado de Denuncias
  isFlagModalOpen = signal<boolean>(false);
  isSendingFlag = signal<boolean>(false);
  flagTarget = signal<{ type: string; id: string; label: string } | null>(null);
  flagMotivo = signal<MotivoDenuncia>('spam');
  flagDescripcion = signal<string>('');

  // Estado de Datos
  reports = signal<PetReport[]>([]);
  totalResults = signal<number>(0);
  hasMore = signal<boolean>(false);
  especies = signal<Especie[]>([]);

  // Estado UI
  isLoading = signal<boolean>(false);
  isLoadingMore = signal<boolean>(false);
  viewMode = signal<'grid' | 'list'>('grid');
  isMapModalOpen = signal<boolean>(false);

  // Filtros
  searchQuery = signal<string>('');
  statusFilter = signal<number | null>(null); // null = Todos, 1 = Encontrado, 2 = Perdido, 3 = Avistado, 4 = Reunido
  selectedEspecieId = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');

  // Ubicación Geográfica
  center = signal<[number, number]>([-9.1214, -78.5308]); // Nuevo Chimbote por defecto
  geoRadio = signal<number>(0); // 0 = Inactivo

  // Paginación
  currentPage = signal<number>(1);
  pageSize = signal<number>(12);

  // Filtro Geográfico Activo
  isGeoActive = computed(() => this.geoRadio() > 0);

  constructor() {
    // Escucha cambios en filtros para recargar a la página 1
    effect(() => {
      // Registrar dependencias de reactividad
      this.searchQuery();
      this.statusFilter();
      this.selectedEspecieId();
      this.startDate();
      this.endDate();
      this.geoRadio();
      this.center();

      // Recargar reportes en la página 1
      this.loadReports(1);
    });
  }

  ngOnInit(): void {
    this.loadEspecies();

    // Escuchar creación de nuevos reportes
    if (typeof window !== 'undefined') {
      window.addEventListener('pet-report-created', this.handleReportCreated);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pet-report-created', this.handleReportCreated);
    }
  }

  private handleReportCreated = (): void => {
    this.loadReports(1);
  };

  private async loadEspecies(): Promise<void> {
    try {
      const list = await this.petService.getEspecies();
      this.especies.set(list);
    } catch (err) {
      console.error('Error al cargar especies en reports:', err);
    }
  }

  async loadReports(page = 1): Promise<void> {
    if (page === 1) {
      this.reports.set([]);
    }
    this.currentPage.set(page);
    this.isLoading.set(true);

    try {
      const response = await this.petService.getReportes({
        search: this.searchQuery() || undefined,
        estado: this.statusFilter() !== null ? this.statusFilter()! : undefined,
        id_especie: this.selectedEspecieId() || undefined,
        start_date: this.startDate() || undefined,
        end_date: this.endDate() || undefined,
        lat: this.isGeoActive() ? this.center()[0] : undefined,
        lng: this.isGeoActive() ? this.center()[1] : undefined,
        radio: this.isGeoActive() ? this.geoRadio() : undefined,
        page: page,
        limit: this.pageSize(),
      });

      this.reports.set(response.data || []);
      this.totalResults.set(response.total || 0);
      this.hasMore.set(response.hasMore);
    } catch (err) {
      console.error('Error cargando reportes:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    if (this.isLoading() || this.isLoadingMore() || !this.hasMore()) return;

    this.isLoadingMore.set(true);
    const nextPage = this.currentPage() + 1;
    this.currentPage.set(nextPage);

    try {
      const response = await this.petService.getReportes({
        search: this.searchQuery() || undefined,
        estado: this.statusFilter() !== null ? this.statusFilter()! : undefined,
        id_especie: this.selectedEspecieId() || undefined,
        start_date: this.startDate() || undefined,
        end_date: this.endDate() || undefined,
        lat: this.isGeoActive() ? this.center()[0] : undefined,
        lng: this.isGeoActive() ? this.center()[1] : undefined,
        radio: this.isGeoActive() ? this.geoRadio() : undefined,
        page: nextPage,
        limit: this.pageSize(),
      });

      const newData = response.data || [];
      this.reports.update((prev) => {
        const combined = [...prev, ...newData];
        // Filtrar duplicados por ID
        return combined.filter(
          (item, index, self) =>
            self.findIndex((t) => t.id_reporte_mascota === item.id_reporte_mascota) === index,
        );
      });
      this.hasMore.set(response.hasMore);
    } catch (err) {
      console.error('Error cargando más reportes:', err);
      this.currentPage.set(nextPage - 1);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (typeof window === 'undefined') return;

    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const clientHeight = window.innerHeight;

    // Si falta menos de 350px para llegar al final, cargar más
    if (scrollTop + clientHeight >= scrollHeight - 350) {
      this.loadMore();
    }
  }

  // --- UI Handlers ---

  setMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  setStatus(status: number | null): void {
    this.statusFilter.set(status);
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onEspecieChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedEspecieId.set(select.value);
  }

  onStartDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.startDate.set(input.value);
  }

  onEndDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.endDate.set(input.value);
  }

  openGeoFilter(): void {
    this.isMapModalOpen.set(true);
  }

  closeGeoFilter(): void {
    this.isMapModalOpen.set(false);
  }

  applyGeoFilter(event: { center: [number, number]; radius: number }): void {
    this.center.set(event.center);
    this.geoRadio.set(event.radius);
    this.closeGeoFilter();
  }

  clearGeoFilter(): void {
    this.geoRadio.set(0);
  }

  // Sincronizar cambios en los reportes (Likes, Shares, Comentarios)
  onReportChange(updated: PetReport): void {
    const miUsuarioId = this.usuario()?.id_usuario;
    this.reports.update((list) => {
      // 1. Sincronizar todos los reportes existentes con la nueva data
      let newList = list.map((r) =>
        r.id_reporte_mascota === updated.id_reporte_mascota ? { ...r, ...updated } : r,
      );

      // 2. Si se compartió, evaluar si agregamos un repost propio al inicio
      if (updated.esta_compartido) {
        if (miUsuarioId) {
          const yaExisteRepost = list.some(
            (r) =>
              r.id_reporte_mascota === updated.id_reporte_mascota &&
              r.compartido_por_id === miUsuarioId,
          );
          if (!yaExisteRepost) {
            const repost: PetReport = {
              ...updated,
              compartido_por_id: miUsuarioId,
              compartido_por_nombre: this.usuario()?.nombre || 'Tú',
            };
            newList = [repost, ...newList];
          }
        }
      } else {
        // Si se quitó la compartición, remover el repost propio de la lista
        if (miUsuarioId) {
          newList = newList.filter(
            (r) =>
              !(
                r.id_reporte_mascota === updated.id_reporte_mascota &&
                r.compartido_por_id === miUsuarioId
              ),
          );
        }
      }
      return newList;
    });
  }

  // --- LÓGICA DE DENUNCIAS ---

  onFlagPost(report: PetReport): void {
    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.flagTarget.set({
      type: 'reporte',
      id: report.id_reporte_mascota!,
      label: report.nombre ? `Alerta de ${report.nombre}` : 'Alerta de Mascota',
    });
    this.flagMotivo.set('spam');
    this.flagDescripcion.set('');
    this.isFlagModalOpen.set(true);
  }

  onFlagComment(c: Comentario): void {
    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (!c.id_comentario) return;

    this.flagTarget.set({
      type: 'comentario',
      id: c.id_comentario,
      label: `Comentario de ${c.usuario.nombre || 'Usuario'}`,
    });
    this.flagMotivo.set('spam');
    this.flagDescripcion.set('');
    this.isFlagModalOpen.set(true);
  }

  closeFlagModal(): void {
    this.isFlagModalOpen.set(false);
    this.flagTarget.set(null);
  }

  async submitFlag(): Promise<void> {
    const target = this.flagTarget();
    if (!target) return;

    this.isSendingFlag.set(true);
    try {
      await this.flagService.crearDenuncia({
        tipo_objetivo: target.type as any,
        id_objetivo: target.id,
        motivo: this.flagMotivo(),
        descripcion: this.flagDescripcion(),
      });
      alert('Denuncia enviada correctamente. Gracias por colaborar con la comunidad.');
      this.closeFlagModal();
    } catch (error: any) {
      console.error('Error al enviar la denuncia:', error);
      const errMsg =
        error?.error?.error || 'No se pudo enviar la denuncia. Inténtalo de nuevo más tarde.';
      alert(
        errMsg === 'ya has denunciado este contenido anteriormente'
          ? 'Ya has reportado este contenido anteriormente.'
          : errMsg,
      );
    } finally {
      this.isSendingFlag.set(false);
    }
  }

  onPostDeleted(id: string): void {
    this.reports.update((list) => list.filter((r) => r.id_reporte_mascota !== id));
  }
}
