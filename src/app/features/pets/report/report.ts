import { Component, OnInit, signal, inject, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PetService } from '../../../core/services/pet.service';
import { AuthService } from '../../../core/auth/auth.service';
import { MapComponent } from '../components/map-component/map-component';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { Especie, Raza, Color, CreateReporteMascotaRequest } from '../../../core/models/pet.model';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { LabelComponent } from '../../../shared/components/label/label';
import { Tabs, TabOption } from '../../../shared/components/tabs/tabs';
import { LocationService } from '../../../core/services/location.service';
import { DatePicker } from '../../../shared/components/date-picker/date-picker';
import { CheckboxComponent } from '../../../shared/components/checkbox/checkbox';
import { TimePickerComponent } from '../../../shared/components/time-picker/time-picker.component';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { MentionInputDirective } from '../../../shared/directives/mention-input.directive';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-report-page',
  standalone: true,
  imports: [
    FormsModule,
    MapComponent,
    Navbar,
    Footer,
    Select,
    LabelComponent,
    Tabs,
    DatePicker,
    CheckboxComponent,
    TimePickerComponent,
    MentionInputDirective,
  ],
  templateUrl: './report.html',
  styleUrl: './report.scss',
})
export class ReportComponent implements OnInit {
  private readonly petService = inject(PetService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly locationService = inject(LocationService);
  private readonly cloudinaryService = inject(CloudinaryService);
  private readonly toastService = inject(ToastService);

  isSubmitted = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isUserVerified = signal<boolean>(true);

  estadoOptions = computed<TabOption[]>(() => [
    { value: 2, label: 'Se Perdió', icon: 'error_outline' },
    { value: 1, label: 'La Encontré', icon: 'check_circle_outline' },
    { value: 3, label: 'La Avisté', icon: 'visibility' },
  ]);

  estadoSelectOptions = computed<SelectOption[]>(() => [
    { value: '2', label: 'Se Perdió' },
    { value: '1', label: 'La Encontré' },
    { value: '3', label: 'La Avisté' },
  ]);

  // Listas de catálogo
  especies = signal<Especie[]>([]);
  razas = signal<Raza[]>([]);
  coloresList = signal<Color[]>([]);

  especieOptions = computed<SelectOption[]>(() => {
    return this.especies().map((esp) => ({
      value: esp.id_especie,
      label: esp.nombre,
    }));
  });

  razaOptions = computed<SelectOption[]>(() => {
    return this.razas().map((rz) => ({
      value: rz.id_raza,
      label: rz.nombre,
    }));
  });

  sexoOptions = computed<SelectOption[]>(() => [
    { value: 'M', label: 'Macho' },
    { value: 'H', label: 'Hembra' },
    { value: 'N', label: 'No sé / Desconocido' },
  ]);

  tamanoOptions = computed<SelectOption[]>(() => [
    { value: 'pequeño', label: 'Pequeño (ej. Chihuahua, Gatos)' },
    { value: 'mediano', label: 'Mediano (ej. Cocker)' },
    { value: 'grande', label: 'Grande (ej. Golden Retriever, Labrador)' },
  ]);

  pelajeOptions = computed<SelectOption[]>(() => [
    { value: 'corto', label: 'Corto' },
    { value: 'largo', label: 'Largo' },
    { value: 'medio', label: 'Medio' },
    { value: 'rizado', label: 'Rizado' },
    { value: 'sin pelo', label: 'Sin pelo' },
  ]);

  colorOptions = computed<SelectOption[]>(() => {
    return this.coloresList().map((c) => ({
      value: c.nombre,
      label: c.nombre,
      hex: c.hex,
    }));
  });

  colorSecundarioOptions = computed<SelectOption[]>(() => {
    const primary = this.color();
    return this.coloresList()
      .filter((c) => c.nombre !== primary)
      .map((c) => ({
        value: c.nombre,
        label: c.nombre,
        hex: c.hex,
      }));
  });

  currentStep = signal<number>(1);

  // --- Datos del Paso 1 ---
  selectedEspecieId = signal<string>('');
  selectedRazaId = signal<string>('');
  nombre = signal<string>('');
  estado = signal<number>(2); // 2 = Perdido (defecto), 1 = Encontrado, 3 = Avistado
  sexo = signal<string>('M');
  color = signal<string>('');
  colorSecundario = signal<string>('');
  tamano = signal<string>('mediano'); // pequeño, mediano, grande
  pelo = signal<string>('corto');
  collar = signal<boolean>(false);
  collarColor = signal<string>('');
  recompensa = signal<boolean>(false);
  montoRecompensa = signal<number>(0);
  caracteristicasTags = signal<string[]>([]);
  currentTagInput = signal<string>('');
  descripcion = signal<string>('');
  uploadedImages = signal<string[]>([]); // URLs base64 de fotos cargadas para previsualizar
  uploadedFiles = signal<File[]>([]); // Archivos reales cargados
  radio = signal<number>(500);

  // --- Datos del Paso 2 ---
  fechaAvistamientoDate = signal<Date | null>(new Date());
  fechaAvistamiento = computed(() => {
    const d = this.fechaAvistamientoDate();
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  horaAvistamiento = signal<string>(new Date().toTimeString().substring(0, 5));
  direccion = signal<string>('');
  referencia = signal<string>('');

  // Coordenadas en el mapa
  latitud = signal<number>(-9.1214);
  longitud = signal<number>(-78.5308);
  mapCenter = signal<[number, number]>([-9.1214, -78.5308]);
  locationSelected = signal<boolean>(false);

  async ngOnInit(): Promise<void> {
    // Validar si el usuario está verificado
    const user = this.authService.usuario();
    if (user && user.is_verificado === false) {
      this.isUserVerified.set(false);
      return; // Detener carga adicional
    }

    // Cargar Catálogos
    try {
      const espList = await this.petService.getEspecies();
      this.especies.set(espList);
      if (espList.length > 0) {
        this.selectedEspecieId.set(espList[0].id_especie);
        this.onEspecieChange(espList[0].id_especie);
      }

      const colList = await this.petService.getColores();
      this.coloresList.set(colList);
      // Pre-seleccionar el primer color si hay disponibles
      if (colList.length > 0) {
        this.color.set(colList[0].nombre);
      }
    } catch (err) {
      console.error('Error al inicializar formulario de reportes:', err);
    }

    // Inicializar con ubicación actual si está disponible
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          this.latitud.set(lat);
          this.longitud.set(lng);
          this.mapCenter.set([lat, lng]);
          this.locationSelected.set(true);

          try {
            const res = await this.locationService.reverse(lat, lng);
            if (res && res.display_name) {
              this.direccion.set(res.display_name);
            }
          } catch (err) {
            console.error('Error al realizar geocodificación de GPS inicial:', err);
          }
        },
        (err) => {
          console.info(
            'No se otorgaron permisos de GPS al inicio, el usuario deberá seleccionar manualmente en el mapa.',
          );
        },
      );
    }
  }

  // Cargar razas asociadas a la especie seleccionada
  async onEspecieChange(idEspecie: string): Promise<void> {
    try {
      const razasFiltered = await this.petService.getRazas(idEspecie);
      this.razas.set(razasFiltered);
      if (razasFiltered.length > 0) {
        this.selectedRazaId.set(razasFiltered[0].id_raza);
      } else {
        this.selectedRazaId.set('');
      }
    } catch (err) {
      console.error('Error al cargar razas:', err);
    }
  }

  // Manejo de la simulación de subida de imágenes (Convierte a Base64)
  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files) as File[];
      this.uploadedFiles.update((prev) => [...prev, ...newFiles]);

      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const base64 = e.target.result;
          this.uploadedImages.update((prev) => [...prev, base64]);
        };
        reader.readAsDataURL(files[i]);
      }
    }
  }

  removeImage(index: number): void {
    this.uploadedImages.update((current) => current.filter((_, i) => i !== index));
    this.uploadedFiles.update((current) => current.filter((_, i) => i !== index));
  }

  // Control del Mapa en el Paso 2
  async onMapClick(coords: [number, number]): Promise<void> {
    this.latitud.set(coords[0]);
    this.longitud.set(coords[1]);
    this.mapCenter.set(coords);
    this.locationSelected.set(true);

    try {
      const res = await this.locationService.reverse(coords[0], coords[1]);
      if (res && res.display_name) {
        this.direccion.set(res.display_name);
      }
    } catch (err) {
      console.error('Error al realizar geocodificación inversa:', err);
    }
  }

  // Navegación del Asistente
  nextStep(): void {
    if (this.currentStep() === 1) {
      if (!this.selectedEspecieId()) {
        this.toastService.warning('Por favor selecciona una especie.');
        return;
      }
      if (this.estado() === 2 && !this.nombre().trim()) {
        this.toastService.warning('Las mascotas perdidas requieren ingresar un nombre.');
        return;
      }
      this.currentStep.set(2);
    } else if (this.currentStep() === 2) {
      if (!this.color()) {
        this.toastService.warning('Por favor selecciona el color principal de la mascota.');
        return;
      }
      this.currentStep.set(3);
    } else if (this.currentStep() === 3) {
      if (!this.fechaAvistamientoDate()) {
        this.toastService.warning('Por favor selecciona la fecha del suceso.');
        return;
      }
      if (!this.horaAvistamiento()) {
        this.toastService.warning('Por favor ingresa la hora aproximada.');
        return;
      }
      if (!this.locationSelected() || this.latitud() === null || this.longitud() === null) {
        this.toastService.warning(
          'Por favor, selecciona una ubicación exacta en el mapa haciendo clic o usando el botón de GPS.',
        );
        return;
      }
      if (!this.direccion().trim()) {
        this.toastService.warning(
          'Por favor, ingresa una dirección física aproximada o haz clic en el mapa para autocompletarla.',
        );
        return;
      }
      this.currentStep.set(4);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  // Envío final del formulario
  async submitReport(): Promise<void> {
    if (!this.selectedEspecieId()) {
      this.toastService.warning('Por favor selecciona una especie.');
      return;
    }
    if (this.estado() === 2 && !this.nombre().trim()) {
      this.toastService.warning('Las mascotas perdidas requieren ingresar un nombre.');
      return;
    }
    if (!this.locationSelected() || this.latitud() === null || this.longitud() === null) {
      this.toastService.warning('Por favor, selecciona una ubicación exacta en el mapa.');
      return;
    }
    if (!this.direccion().trim()) {
      this.toastService.warning('Por favor, ingresa una dirección física aproximada.');
      return;
    }
    if (this.uploadedFiles().length === 0) {
      this.toastService.warning('Por favor agrega al menos una foto de la mascota.');
      return;
    }

    this.isLoading.set(true);

    // Obtener ID del usuario autenticado
    const user = this.authService.usuario();
    const idUsuario = user?.id_usuario || 'usr-anonimo';

    // 1. Subir imágenes a Cloudinary antes de enviar el reporte al backend
    let imageUrls: string[] = [];
    try {
      const idReporteTemp = crypto.randomUUID();
      const folder = `usuarios/${idUsuario}/reportes/${idReporteTemp}`;
      imageUrls = await Promise.all(
        this.uploadedFiles().map((file) => this.cloudinaryService.uploadImage(file, folder)),
      );
    } catch (cloudinaryErr) {
      console.error('Error al subir imágenes a Cloudinary:', cloudinaryErr);
      this.toastService.error(
        'Hubo un error al subir las imágenes a la nube. Por favor inténtalo de nuevo.',
      );
      this.isLoading.set(false);
      return;
    }

    // Generar características extendidas
    const caracteristicas = {
      color: this.color(),
      color_secundario: this.colorSecundario(),
      sexo: this.sexo(),
      tamanio: this.tamano(),
      pelo: this.pelo(),
      caracteristicas_especiales: this.caracteristicasTags().join(', '),
      collar: this.collar(),
      collar_color: this.collar() ? this.collarColor() : '',
      referencia: this.referencia().trim() || undefined,
      recompensa: this.recompensa(),
      monto_recompensa: this.recompensa() ? Number(this.montoRecompensa()) : 0,
    };

    let desc = this.descripcion().trim();
    if (this.referencia().trim()) {
      desc = desc
        ? `${desc}\n\n(Referencia de ubicación: ${this.referencia().trim()})`
        : `Referencia de ubicación: ${this.referencia().trim()}`;
    }

    const request: CreateReporteMascotaRequest = {
      id_usuario: idUsuario,
      id_especie: this.selectedEspecieId(),
      id_raza: this.selectedRazaId(),
      estado: this.estado(),
      nombre: this.nombre().trim() || undefined,
      caracteristicas,
      descripcion: desc || undefined,
      latitud: this.latitud(),
      longitud: this.longitud(),
      radio: this.radio(),
      fecha_avistamiento: this.fechaAvistamiento(),
      hora_avistamiento: this.horaAvistamiento(),
      direccion: this.direccion().trim() || undefined,
      ubicacion: this.direccion().trim() || 'Ubicación seleccionada en mapa',
      departamento: 'Ancash',
      provincia: 'Santa',
      distrito: 'Nuevo Chimbote',
      imagenes: imageUrls,
      collar: this.collar(),
      collar_color: this.collar() ? this.collarColor().trim() : '',
      recompensa: this.recompensa(),
      monto_recompensa: this.recompensa() ? Number(this.montoRecompensa()) : 0,
    };

    try {
      await this.petService.createReporte(request);
      this.isSubmitted.set(true);
      this.toastService.success('¡Alerta de mascota publicada exitosamente!');
    } catch (err) {
      console.error('Error al guardar reporte:', err);
      this.toastService.error('Hubo un error al guardar el reporte. Inténtalo de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  goToProfile(): void {
    this.router.navigate(['/perfil']);
  }

  onTagKeyDown(event: KeyboardEvent, inputEl: HTMLInputElement): void {
    if (event.key === ',' || event.key === 'Enter') {
      event.preventDefault();
      const val = inputEl.value.trim().replace(/,$/, '');
      if (val && !this.caracteristicasTags().includes(val)) {
        this.caracteristicasTags.update((prev) => [...prev, val]);
        this.currentTagInput.set('');
        inputEl.value = '';
      }
    }
  }

  removeTag(index: number): void {
    this.caracteristicasTags.update((prev) => prev.filter((_, i) => i !== index));
  }
}
