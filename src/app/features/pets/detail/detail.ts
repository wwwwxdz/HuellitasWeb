import { Component, OnInit, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PetService } from '../../../core/services/pet.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { UserService } from '../../../core/services/user.service';
import { PetReport, Avistamiento, CreateAvistamientoRequest } from '../../../core/models/pet.model';
import { Comentario } from '../../../core/models/comment.model';
import { LocationService } from '../../../core/services/location.service';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { MapComponent } from '../components/map-component/map-component';
import { ImageCarouselComponent } from '../../../shared/components/image-carousel/image-carousel';
import { ImageViewerComponent } from '../../../shared/components/image-viewer/image-viewer.component';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { PetCommentsComponent } from './components/pet-comments/pet-comments';

import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { BadgeComponent } from '../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../shared/components/button/button';
import { MentionInputDirective } from '../../../shared/directives/mention-input.directive';
import { MentionHighlightPipe } from '../../../shared/pipes/mention-highlight.pipe';
import { OptionsDropdownComponent } from '../../../shared/components/options-dropdown/options-dropdown';
import { formatTimeAgo } from '../../../core/utils/date.utils';
import { FlagModalComponent } from '../../../shared/components/flag-modal/flag-modal';
import { FlagService } from '../../../core/services/flag.service';
import { MotivoDenuncia } from '../../../core/models/flag.model';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    Navbar,
    Footer,
    MapComponent,
    ImageCarouselComponent,
    BadgeComponent,
    ButtonComponent,
    ImageViewerComponent,
    ModalComponent,
    MentionInputDirective,
    MentionHighlightPipe,
    OptionsDropdownComponent,
    FlagModalComponent,
    PetCommentsComponent
  ],
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
  providers: [DatePipe]
})
export class PetDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private petService = inject(PetService);
  private authService = inject(AuthService);
  private cloudinaryService = inject(CloudinaryService);
  private locationService = inject(LocationService);
  private flagService = inject(FlagService);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);

  // Estado
  report = signal<PetReport | null>(null);
  isLoading = signal<boolean>(true);
  activeViewerImage = signal<string | null>(null);
  
  // Sesión
  usuario = this.authService.usuario;

  // Historial de cambios
  historial = signal<any[]>([]);
  isContactModalOpen = signal(false);

  // Estado de Denuncias
  isFlagModalOpen = signal<boolean>(false);
  isSendingFlag = signal<boolean>(false);
  flagTarget = signal<{ type: string, id: string, label: string } | null>(null);
  flagMotivo = signal<MotivoDenuncia>('spam');
  flagDescripcion = signal<string>('');

  readonly REPORT_OPTIONS = [
    { label: 'Denunciar publicación', icon: 'flag', value: 'report', danger: true }
  ];

  // ─── Avistamientos ───────────────────────────────────────────────────
  sightings = signal<Avistamiento[]>([]);
  isLoadingSightings = signal(false);
  isSightingModalOpen = signal(false);
  isSubmittingSighting = signal(false);
  sightingImageFiles = signal<File[]>([]);
  sightingImagePreviews = signal<string[]>([]);
  resolvingSightings = signal<Set<string>>(new Set());

  // Visualización de mapa en modal para un avistamiento individual
  isSightingMapModalOpen = signal(false);
  selectedSightingForMap = signal<Avistamiento | null>(null);

  sightingForm = signal<CreateAvistamientoRequest>({
    latitud: -12.046374,
    longitud: -77.042793,
    radio: 500,
    fecha_avistamiento: '',
    hora_avistamiento: '',
    ubicacion: '',
    descripcion: '',
    imagenes: []
  });

  openSightingMapModal(s: Avistamiento): void {
    this.selectedSightingForMap.set(s);
    this.isSightingMapModalOpen.set(true);
  }

  sightingPoint = computed(() => {
    const s = this.selectedSightingForMap();
    if (!s) return [];
    return [{
      id_reporte_mascota: s.id_avistamiento || 'sighting-point',
      nombre: 'Avistamiento',
      estado: 3, // Estado avistado
      latitud: s.latitud,
      longitud: s.longitud,
      id_especie: this.report()?.id_especie || '',
      foto_principal: s.imagenes && s.imagenes.length > 0 ? s.imagenes[0].url : ''
    }];
  });

  isOwnReport = computed(() => {
    const r = this.report();
    const u = this.usuario();
    if (!r || !u) return false;
    return r.usuario?.id_usuario === u.id_usuario;
  });

  // Avistamientos visibles según el rol del usuario
  sightingsVisibles = computed(() => {
    const all = this.sightings();
    const u = this.usuario();
    if (this.isOwnReport()) return all; // Dueño: ve todos
    return all.filter(s =>
      s.estado === 1 ||                        // Aceptado: público (1)
      (u && s.id_usuario_informante === u.id_usuario) // Propio: solo el informante
    );
  });

  // Avistamientos aceptados que se graficarán en el mapa de "Última ubicación conocida"
  sightingsAceptados = computed(() => {
    return this.sightings().filter(s => s.estado === 1);
  });

  // La sección solo se muestra al dueño o si hay avistamientos visibles
  hasSightingsSection = computed(() =>
    this.isOwnReport() || this.sightingsVisibles().length > 0
  );

  isAllSightingsModalOpen = signal(false);

  sightingsOrdenados = computed(() => {
    const list = [...this.sightingsVisibles()];
    return list.sort((a, b) => {
      const dateA = a.creado_en ? new Date(a.creado_en).getTime() : 0;
      const dateB = b.creado_en ? new Date(b.creado_en).getTime() : 0;
      return dateB - dateA; // Descendente: más reciente primero
    });
  });

  sightingsLimitados = computed(() => {
    return this.sightingsOrdenados().slice(0, 2);
  });

  tieneMasSightings = computed(() => {
    return this.sightingsVisibles().length > 2;
  });

  // Helpers de visualización
  pawPoint = computed(() => {
    const r = this.report();
    if (!r) return [];
    return [{
      id_reporte_mascota: r.id_reporte_mascota,
      nombre: r.nombre,
      estado: r.estado,
      latitud: r.latitud,
      longitud: r.longitud,
      id_especie: r.id_especie || '',
      foto_principal: r.imagen_principal?.url || ''
    }];
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/pets/reports']);
      return;
    }
    this.loadReportDetails(id);
  }

  async loadReportDetails(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.petService.getReporte(id);
      this.report.set(data);
      await Promise.all([
        this.loadSightings(id),
        this.loadHistorial(id)
      ]);
    } catch (err) {
      console.error('Error al cargar detalle de mascota:', err);
      this.router.navigate(['/pets/reports']);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadSightings(reportId: string): Promise<void> {
    this.isLoadingSightings.set(true);
    try {
      const data = await this.petService.getSightings(reportId);
      this.sightings.set(data || []);
    } catch (err) {
      this.sightings.set([]);
    } finally {
      this.isLoadingSightings.set(false);
    }
  }

  openContactModal(): void {
    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.isContactModalOpen.set(true);
  }

  openSightingModal(): void {
    if (!this.usuario()) {
      this.authService.openAuthModal();
      return;
    }
    const r = this.report();
    const now = new Date();
    
    // Valores por defecto
    this.sightingForm.set({
      latitud: r?.latitud ?? -12.046374,
      longitud: r?.longitud ?? -77.042793,
      radio: 500,
      fecha_avistamiento: now.toISOString().substring(0, 10),
      hora_avistamiento: now.toTimeString().substring(0, 5),
      ubicacion: r?.ubicacion || '',
      descripcion: '',
      imagenes: []
    });
    
    this.sightingImageFiles.set([]);
    this.sightingImagePreviews.set([]);
    this.isSightingModalOpen.set(true);

    // Intentar cargar la ubicación actual del usuario por GPS de forma automática
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          this.sightingForm.update(f => ({
            ...f,
            latitud: lat,
            longitud: lng
          }));

          // Obtener dirección aproximada a través de reverse geocoding
          try {
            const res = await this.locationService.reverse(lat, lng);
            if (res && res.display_name) {
              this.sightingForm.update(f => ({
                ...f,
                ubicacion: res.display_name
              }));
            }
          } catch (err) {
            console.error('Error al geocodificar dirección por GPS del avistamiento:', err);
          }
        },
        (err) => {
          console.warn('Uso del GPS del usuario declinado o no disponible para el avistamiento, usando la del reporte:', err);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }

  onSightingFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files);
      const currentFiles = this.sightingImageFiles();
      
      // Limitar a máximo 4
      const combinedFiles = [...currentFiles, ...newFiles].slice(0, 4);
      this.sightingImageFiles.set(combinedFiles);
      
      // Generar previews
      const previews: string[] = [];
      let loadedCount = 0;
      
      if (combinedFiles.length === 0) {
        this.sightingImagePreviews.set([]);
        return;
      }
      
      combinedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = () => {
          previews[index] = reader.result as string;
          loadedCount++;
          if (loadedCount === combinedFiles.length) {
            this.sightingImagePreviews.set(previews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }

  removeSelectedSightingImage(index: number): void {
    const files = [...this.sightingImageFiles()];
    const previews = [...this.sightingImagePreviews()];
    files.splice(index, 1);
    previews.splice(index, 1);
    this.sightingImageFiles.set(files);
    this.sightingImagePreviews.set(previews);
  }

  async onSightingLocationChange(event: [number, number]): Promise<void> {
    const [lat, lng] = event;
    this.sightingForm.update(f => ({ ...f, latitud: lat, longitud: lng }));
    
    // Obtener dirección descriptiva
    try {
      const res = await this.locationService.reverse(lat, lng);
      if (res && res.display_name) {
        this.sightingForm.update(f => ({ ...f, ubicacion: res.display_name }));
      }
    } catch (err) {
      console.error('Error al obtener dirección del avistamiento:', err);
    }
  }

  async confirmSighting(): Promise<void> {
    const r = this.report();
    if (!r?.id_reporte_mascota) return;

    const formVal = this.sightingForm();
    if (!formVal.ubicacion.trim()) {
      alert('Por favor, ingresa la ubicación o referencia descriptiva del avistamiento.');
      return;
    }

    this.isSubmittingSighting.set(true);
    try {
      const imageUrls: string[] = [];
      const files = this.sightingImageFiles();
      if (files.length > 0) {
        const idUsuario = this.usuario()?.id_usuario || 'usr-anonimo';
        const idReporte = r.id_reporte_mascota;
        const tempIdAvistamiento = crypto.randomUUID();
        
        const uploadPromises = files.map(async (file, idx) => {
          const folder = `usuarios/${idUsuario}/reportes/${idReporte}/avistamientos/${tempIdAvistamiento}/img_${idx}`;
          return this.cloudinaryService.uploadImage(file, folder);
        });
        
        const uploadedUrls = await Promise.all(uploadPromises);
        imageUrls.push(...uploadedUrls);
      }

      const formVal = this.sightingForm();
      const payload: CreateAvistamientoRequest = {
        ...formVal,
        imagenes: imageUrls
      };

      await this.petService.createSighting(r.id_reporte_mascota, payload);
      this.isSightingModalOpen.set(false);
      await this.loadSightings(r.id_reporte_mascota);
    } catch (err) {
      console.error('Error al enviar avistamiento:', err);
    } finally {
      this.isSubmittingSighting.set(false);
    }
  }

  updateSightingField<K extends keyof CreateAvistamientoRequest>(key: K, value: CreateAvistamientoRequest[K]): void {
    this.sightingForm.update(f => ({ ...f, [key]: value }));
  }

  async resolverAvistamiento(idAvistamiento: string | undefined, nuevoEstado: 1 | 2 | 3): Promise<void> {
    if (!idAvistamiento) return;
    const r = this.report();
    if (!r) return;

    // Solo el dueño del post puede aceptar o rechazar avistamientos
    if (!this.isOwnReport()) {
      alert('Solo el creador del reporte puede aceptar o rechazar avistamientos.');
      return;
    }

    this.resolvingSightings.update(set => {
      const copy = new Set(set);
      copy.add(idAvistamiento);
      return copy;
    });

    try {
      await this.petService.updateSightingStatus(idAvistamiento, nuevoEstado);
      
      if (nuevoEstado === 1) {
        alert('El avistamiento ha sido aceptado correctamente.');
      } else if (nuevoEstado === 3) {
        alert('El avistamiento ha sido rechazado correctamente.');
      }

      // Actualizar localmente el estado del avistamiento modificado
      this.sightings.update(list =>
        list.map(s => s.id_avistamiento === idAvistamiento ? { ...s, estado: nuevoEstado } : s)
      );
    } catch (err) {
      console.error('Error al actualizar el estado del avistamiento:', err);
      alert('No se pudo actualizar el estado del avistamiento. Inténtalo de nuevo.');
    } finally {
      this.resolvingSightings.update(set => {
        const copy = new Set(set);
        copy.delete(idAvistamiento);
        return copy;
      });
    }
  }



  getImages(report: PetReport): string[] {
    const urls: string[] = [];
    if (report.imagen_principal?.url) {
      urls.push(report.imagen_principal.url);
    }
    if (report.imagenes && report.imagenes.length) {
      report.imagenes.forEach(img => {
        if (img.url && img.url !== report.imagen_principal?.url) {
          urls.push(img.url);
        }
      });
    }
    if (urls.length === 0) {
      urls.push('/images/pet-max.png');
    }
    return urls;
  }

  getSightingImages(s: Avistamiento): string[] {
    if (!s.imagenes || s.imagenes.length === 0) return [];
    return s.imagenes.map(img => img.url);
  }

  getStatusLabel(estado: number): 'perdido' | 'avistado' | 'encontrado' | 'reunido' {
    if (estado === 1) return 'encontrado';
    if (estado === 2) return 'perdido';
    if (estado === 3) return 'avistado';
    return 'reunido';
  }

  getStatusClass(estado: number): string {
    if (estado === 1) return 'status-encontrado';
    if (estado === 2) return 'status-perdido';
    if (estado === 3) return 'status-avistado';
    return 'status-reunido';
  }

  // --- LIKES Y COMPARTIR ---
  async toggleLike(): Promise<void> {
    const r = this.report();
    if (!r) return;

    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const oldLiked = r.liked_por_usuario;
    const oldTotal = r.total_likes || 0;

    // Optimista
    this.report.set({
      ...r,
      liked_por_usuario: !oldLiked,
      total_likes: oldLiked ? oldTotal - 1 : oldTotal + 1
    });

    try {
      const res = await this.petService.toggleLike(r.id_reporte_mascota);
      this.report.set({
        ...r,
        liked_por_usuario: res.liked_por_usuario,
        total_likes: res.total_likes
      });
    } catch (err) {
      console.error('Error al dar like:', err);
      // Revertir
      this.report.set({
        ...r,
        liked_por_usuario: oldLiked,
        total_likes: oldTotal
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/pets/reports']);
  }



  async loadHistorial(reportId: string): Promise<void> {
    try {
      const res = await this.petService.getHistorial(reportId);
      this.historial.set(res.data || []);
    } catch (err) {
      this.historial.set([]);
    }
  }

  getFechaRelativa(fecha: string | Date | undefined): string {
    return formatTimeAgo(fecha);
  }

  getCambioDescriptivo(entry: any): string {
    if (!entry.cambios || Object.keys(entry.cambios).length === 0) {
      return 'Se creó el reporte';
    }

    const fields = Object.keys(entry.cambios);
    
    if (fields.includes('estado')) {
      const nuevoEstado = entry.cambios['estado']?.nuevo;
      if (nuevoEstado === 1) return 'Se marcó como encontrado';
      if (nuevoEstado === 2) return 'Se marcó como perdido';
      if (nuevoEstado === 3) return 'Se marcó como avistado';
      if (nuevoEstado === 4) return 'Se marcó como reunido';
      return 'Se actualizó el estado del reporte';
    }

    if (fields.includes('latitud') || fields.includes('longitud') || fields.includes('ubicacion') || fields.includes('distrito')) {
      return 'Se actualizó la ubicación en el mapa';
    }

    if (fields.includes('imagenes') || fields.includes('imagen_principal')) {
      return 'Se agregaron o modificaron las fotografías';
    }

    if (fields.includes('descripcion') || fields.includes('caracteristicas')) {
      return 'Se actualizaron las características o descripción';
    }

    return 'Se actualizó información del reporte';
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

  onReportOptionSelected(option: any): void {
    if (option.value === 'report') {
      this.onFlagPost();
    }
  }

  onFlagPost(): void {
    if (!this.usuario()) {
      this.authService.openAuthModal();
      return;
    }
    const r = this.report();
    if (!r) return;
    
    this.flagTarget.set({
      type: 'reporte',
      id: r.id_reporte_mascota,
      label: r.nombre ? `Alerta de ${r.nombre}` : 'Alerta de Mascota'
    });
    this.flagMotivo.set('spam');
    this.flagDescripcion.set('');
    this.isFlagModalOpen.set(true);
  }

  onReportComment(c: Comentario): void {
    if (!this.usuario()) {
      this.authService.openAuthModal();
      return;
    }
    if (!c.id_comentario) return;

    this.flagTarget.set({
      type: 'comentario',
      id: c.id_comentario,
      label: `Comentario de ${c.usuario.nombre || 'Usuario'}`
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
        descripcion: this.flagDescripcion()
      });
      alert('Denuncia enviada correctamente. Gracias por colaborar con la comunidad.');
      this.closeFlagModal();
    } catch (error: any) {
      console.error('Error al enviar la denuncia:', error);
      const errMsg = error?.error?.error || 'No se pudo enviar la denuncia. Inténtalo de nuevo más tarde.';
      alert(errMsg === 'ya has denunciado este contenido anteriormente'
        ? 'Ya has reportado este contenido anteriormente.'
        : errMsg);
    } finally {
      this.isSendingFlag.set(false);
    }
  }

  // --- LÓGICA DE POPOVER DE USUARIO ---
  isPopoverVisible = signal<boolean>(false);
  popoverUser = signal<any>(null);
  isLoadingPopover = signal<boolean>(false);
  private openTimeout: any = null;
  private closeTimeout: any = null;

  onUserEnter(): void {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    
    if (this.isPopoverVisible()) return;

    this.openTimeout = setTimeout(async () => {
      this.isPopoverVisible.set(true);
      this.cdr.detectChanges();
      
      if (this.popoverUser()) return; // ya cargado
      
      const idUsuario = this.report()?.usuario?.id_usuario;
      if (!idUsuario) return;

      this.isLoadingPopover.set(true);
      this.cdr.detectChanges();

      try {
        const otherUser: any = await this.userService.getUsuarioById(idUsuario);
        const userDetails = otherUser?.data || otherUser || this.report()?.usuario;
        
        // Obtener estadísticas
        const reports = await this.petService.getReportesCreados(idUsuario);
        const reunidos = reports.filter((r: any) => r.estado === 4).length;

        this.popoverUser.set({
          ...userDetails,
          totalReports: reports.length,
          totalReunidos: reunidos
        });
      } catch (err) {
        console.error('Error al cargar datos de popover:', err);
      } finally {
        this.isLoadingPopover.set(false);
        this.cdr.detectChanges();
      }
    }, 300);
  }

  onUserLeave(): void {
    if (this.openTimeout) {
      clearTimeout(this.openTimeout);
      this.openTimeout = null;
    }
    
    this.closeTimeout = setTimeout(() => {
      this.isPopoverVisible.set(false);
      this.cdr.detectChanges();
    }, 200);
  }

  onPopoverEnter(): void {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  }

  onPopoverLeave(): void {
    this.closeTimeout = setTimeout(() => {
      this.isPopoverVisible.set(false);
      this.cdr.detectChanges();
    }, 200);
  }

  navigateToProfile(event: Event): void {
    event.stopPropagation();
    const idUsuario = this.report()?.usuario?.id_usuario;
    if (idUsuario) {
      this.router.navigate(['/perfil', idUsuario]);
    }
  }
}
