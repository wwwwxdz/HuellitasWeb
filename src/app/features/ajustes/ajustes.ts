import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UserService } from '../../core/services/user.service';
import { CloudinaryService } from '../../core/services/cloudinary.service';
import { LocationService } from '../../core/services/location.service';
import { PetService } from '../../core/services/pet.service';
import { MapComponent } from '../../features/pets/components/map-component/map-component';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';
import { firstValueFrom } from 'rxjs';

interface UbigeoItem {
  departamento: string;
  provincia: string;
  distrito: string;
  nombre: string;
}

interface UbigeoData {
  reniec: UbigeoItem[];
}

interface SelectOption {
  value: string;
  label: string;
}

type SettingsTab = 'perfil' | 'mapa' | 'seguridad';

import { ButtonComponent } from '../../shared/components/button/button';
import { CodeInputComponent } from '../../shared/components/code-input/code-input';
import { ModalComponent } from '../../shared/components/modal/modal';
import { Select } from '../../shared/components/select/select';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule, 
    Navbar, 
    Footer, 
    MapComponent, 
    ButtonComponent,
    CodeInputComponent,
    ModalComponent,
    Select
  ],
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.scss',
})
export class AjustesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly cloudinaryService = inject(CloudinaryService);
  private readonly locationService = inject(LocationService);
  private readonly fb = inject(FormBuilder);
  private readonly petService = inject(PetService);
  private readonly router = inject(Router);

  // Estado reactivo
  usuario = this.authService.usuario;
  activeTab = signal<SettingsTab>('perfil');
  isSaving = signal(false);
  isUploadingPhoto = signal(false);
  saveSuccess = signal<string | null>(null);
  saveError = signal<string | null>(null);
  previewUrl = signal<string | null>(null);

  // Estadísticas para el sidebar unificado
  userReports = signal<any[]>([]);

  // Datos cargados dinámicamente de ubigeo-peru
  private ubigeoData: any = null;

  // Visibilidad de contraseñas
  showPasswordNuevo = signal(false);
  showPasswordConfirmar = signal(false);
  
  // Modal de advertencia de cambio de nombre (1 vez al mes)
  mostrarModalNombre = signal(false);
  pendingPerfilData: any = null;

  // Flujo de código de verificación por correo
  codigoEnviado = signal(false);
  enviandoCodigo = signal(false);

  // Formulario de perfil
  perfilForm!: FormGroup;
  // Formulario de seguridad (contraseña)
  seguridadForm!: FormGroup;

  // Preferencias de Ubicación del Ubigeo
  departamentos = signal<SelectOption[]>([]);
  provincias = signal<SelectOption[]>([]);
  distritos = signal<SelectOption[]>([]);
  currentAddress = signal<string>('Haz clic en el mapa para obtener la dirección descriptiva');

  async ngOnInit(): Promise<void> {
    this.buildForms();
    this.setupListeners();
    this.cargarStats();
    await this.loadUbigeoData();
  }

  private async loadUbigeoData(): Promise<void> {
    try {
      const module = await import('ubigeo-peru');
      this.ubigeoData = module.default || module;
      this.initUbigeo();
      this.patchPerfilForm();
    } catch (err) {
      console.error('Error al cargar dinámicamente ubigeo-peru:', err);
    }
  }

  private async cargarStats(): Promise<void> {
    const user = this.usuario();
    if (user && user.id_usuario) {
      try {
        const reports = await this.petService.getReportesCreados(user.id_usuario);
        this.userReports.set(reports);
      } catch (err) {
        console.error('Error al cargar estadísticas en ajustes:', err);
      }
    }
  }

  logout(): void {
    this.authService.logout();
  }

  crearReporte(): void {
    this.router.navigate(['/pets/report']);
  }

  private buildForms(): void {
    this.perfilForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: [''],
      bio: ['', [Validators.maxLength(250)]],
      foto_perfil: [''],
      departamento: [''],
      provincia: [''],
      distrito: [''],
      latitud: [null],
      longitud: [null],
      radio: [10000] // default 10km (10000 metros)
    });

    this.seguridadForm = this.fb.group(
      {
        codigo_verificacion: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
        password_nuevo: ['', [Validators.required, Validators.minLength(6)]],
        password_confirmar: ['', Validators.required],
      },
      { validators: this.passwordsMatch }
    );
  }

  private passwordsMatch(group: AbstractControl) {
    const nuevo = group.get('password_nuevo')?.value;
    const confirmar = group.get('password_confirmar')?.value;
    return nuevo === confirmar ? null : { noMatch: true };
  }

  private initUbigeo(): void {
    if (!this.ubigeoData) return;
    try {
      const list = (this.ubigeoData as unknown as UbigeoData).reniec
        .filter((i: UbigeoItem) => i.provincia === '00' && i.distrito === '00')
        .map((i: UbigeoItem) => ({ value: i.nombre, label: i.nombre }));
      this.departamentos.set(list);
    } catch (err) {
      console.error('Error al inicializar ubigeo:', err);
    }
  }

  private setupListeners(): void {
    this.perfilForm.get('departamento')?.valueChanges.subscribe(deptName => {
      if (!this.ubigeoData) return;
      if (!deptName) {
        this.provincias.set([]);
        this.distritos.set([]);
        this.perfilForm.patchValue({ provincia: '', distrito: '' }, { emitEvent: false });
        return;
      }
      const dept = (this.ubigeoData as unknown as UbigeoData).reniec.find((i: UbigeoItem) => i.nombre === deptName && i.provincia === '00');
      const deptCode = dept?.departamento || '';
      
      const provs = (this.ubigeoData as unknown as UbigeoData).reniec
        .filter((i: UbigeoItem) => i.departamento === deptCode && i.provincia !== '00' && i.distrito === '00')
        .map((i: UbigeoItem) => ({ value: i.nombre, label: i.nombre }));
      this.provincias.set(provs);
      
      this.perfilForm.patchValue({ provincia: '', distrito: '' }, { emitEvent: false });
      this.distritos.set([]);
    });

    this.perfilForm.get('provincia')?.valueChanges.subscribe(provName => {
      if (!this.ubigeoData) return;
      if (!provName) {
        this.distritos.set([]);
        this.perfilForm.patchValue({ distrito: '' }, { emitEvent: false });
        return;
      }
      const deptName = this.perfilForm.get('departamento')?.value;
      const dept = (this.ubigeoData as unknown as UbigeoData).reniec.find((i: UbigeoItem) => i.nombre === deptName && i.provincia === '00');
      const deptCode = dept?.departamento || '';

      const prov = (this.ubigeoData as unknown as UbigeoData).reniec.find((i: UbigeoItem) => 
        i.departamento === deptCode && i.nombre === provName && i.distrito === '00'
      );
      const provCode = prov?.provincia || '';

      const dists = (this.ubigeoData as unknown as UbigeoData).reniec
        .filter((i: UbigeoItem) => i.departamento === deptCode && i.provincia === provCode && i.distrito !== '00')
        .map((i: UbigeoItem) => ({ value: i.nombre, label: i.nombre }));
      this.distritos.set(dists);

      this.perfilForm.patchValue({ distrito: '' }, { emitEvent: false });
    });
  }

  // Aliases públicos para el template (la lógica real se ejecuta en setupListeners vía valueChanges)
  onDepartamentoChange(_value: string): void { /* handled by valueChanges listener */ }
  onProvinciaChange(_value: string): void { /* handled by valueChanges listener */ }

  onLocationChange(event: [number, number]): void {
    const [lat, lng] = event;
    this.perfilForm.patchValue({
      latitud: lat,
      longitud: lng
    });
    this.updateAddress(lat, lng);
  }

  onRadiusInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.perfilForm.patchValue({
      radio: Number(input.value)
    });
  }

  private async updateAddress(lat: number, lng: number): Promise<void> {
    if (!lat || !lng) return;
    this.currentAddress.set('Obteniendo dirección descriptiva...');
    try {
      const res = await this.locationService.reverse(lat, lng);
      this.currentAddress.set(res.display_name || `Ubicación: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch {
      this.currentAddress.set(`Ubicación: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }

  private patchPerfilForm(): void {
    const u = this.usuario();
    if (!u) return;

    if (u.departamento && this.ubigeoData) {
      const dept = (this.ubigeoData as unknown as UbigeoData).reniec.find((i: UbigeoItem) => i.nombre === u.departamento && i.provincia === '00');
      if (dept) {
        const provs = (this.ubigeoData as unknown as UbigeoData).reniec
          .filter((i: UbigeoItem) => i.departamento === dept.departamento && i.provincia !== '00' && i.distrito === '00')
          .map((i: UbigeoItem) => ({ value: i.nombre, label: i.nombre }));
        this.provincias.set(provs);

        if (u.provincia) {
          const prov = (this.ubigeoData as unknown as UbigeoData).reniec.find((i: UbigeoItem) => 
            i.departamento === dept.departamento && i.nombre === u.provincia && i.distrito === '00'
          );
          if (prov) {
            const dists = (this.ubigeoData as unknown as UbigeoData).reniec
              .filter((i: UbigeoItem) => i.departamento === dept.departamento && i.provincia === prov.provincia && i.distrito !== '00')
              .map((i: UbigeoItem) => ({ value: i.nombre, label: i.nombre }));
            this.distritos.set(dists);
          }
        }
      }
    }

    this.perfilForm.patchValue({
      nombre: u.nombre || '',
      email: u.email || '',
      telefono: u.telefono || '',
      bio: u.bio || '',
      foto_perfil: u.foto_perfil || '',
      departamento: u.departamento || '',
      provincia: u.provincia || '',
      distrito: u.distrito || '',
      latitud: u.latitud !== undefined ? u.latitud : null,
      longitud: u.longitud !== undefined ? u.longitud : null,
      radio: u.radio !== undefined ? u.radio : 10000,
    });

    if (u.latitud && u.longitud) {
      this.updateAddress(Number(u.latitud), Number(u.longitud));
    }
  }

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.clearMessages();
  }

  clearMessages(): void {
    this.saveSuccess.set(null);
    this.saveError.set(null);
  }

  // ── Foto de perfil ──────────────────────────────────────────────
  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Preview local inmediata
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);

    const user = this.usuario();
    if (!user) return;

    this.isUploadingPhoto.set(true);
    this.clearMessages();

    try {
      const url = await this.cloudinaryService.uploadImage(file, `usuarios/${user.id_usuario}/perfil`);
      this.perfilForm.patchValue({ foto_perfil: url });
      await this.userService.updateUsuario(user.id_usuario, { foto_perfil: url });
      this.authService.patchUsuario({ foto_perfil: url });
      await firstValueFrom(this.authService.refreshUser());
      this.previewUrl.set(null);
      this.saveSuccess.set('Foto de perfil actualizada correctamente.');
    } catch {
      this.saveError.set('No se pudo subir la foto. Inténtalo de nuevo.');
      this.previewUrl.set(null);
    } finally {
      this.isUploadingPhoto.set(false);
    }
  }

  // ── Guardar datos de perfil ─────────────────────────────────────
  async onSavePerfil(): Promise<void> {
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      return;
    }

    const user = this.usuario();
    if (!user) return;

    const { foto_perfil, ...data } = this.perfilForm.value;

    // Si el nombre cambió, mostrar modal de advertencia primero
    if (data.nombre && data.nombre.trim() !== (user.nombre || '').trim()) {
      this.pendingPerfilData = data;
      this.mostrarModalNombre.set(true);
      return;
    }

    await this.guardarPerfilData(user.id_usuario, data);
  }

  async confirmarCambioNombre(): Promise<void> {
    const user = this.usuario();
    if (!user || !this.pendingPerfilData) return;
    this.mostrarModalNombre.set(false);
    await this.guardarPerfilData(user.id_usuario, this.pendingPerfilData);
    this.pendingPerfilData = null;
  }

  cancelarCambioNombre(): void {
    this.mostrarModalNombre.set(false);
    this.pendingPerfilData = null;
  }

  private async guardarPerfilData(idUsuario: string, data: any): Promise<void> {
    this.isSaving.set(true);
    this.clearMessages();

    try {
      if (data.latitud !== null && data.latitud !== undefined) {
        data.latitud = Number(data.latitud);
      }
      if (data.longitud !== null && data.longitud !== undefined) {
        data.longitud = Number(data.longitud);
      }
      if (data.radio !== null && data.radio !== undefined) {
        data.radio = Number(data.radio);
      }

      await this.userService.updateUsuario(idUsuario, data);
      this.authService.patchUsuario(data);
      await firstValueFrom(this.authService.refreshUser());
      this.saveSuccess.set('Datos guardados correctamente.');
    } catch (err: any) {
      const msg = err?.error?.error || err?.message || 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
      this.saveError.set(msg);
    } finally {
      this.isSaving.set(false);
    }
  }

  // ── Cambio de contraseña ────────────────────────────────────────
  async solicitarCodigoVerificacion(): Promise<void> {
    const user = this.usuario();
    if (!user || !user.email) {
      this.saveError.set('No se encontró un correo electrónico asociado a tu cuenta.');
      return;
    }

    this.enviandoCodigo.set(true);
    this.clearMessages();

    try {
      await firstValueFrom(this.authService.requestCode(user.email));
      this.codigoEnviado.set(true);
      this.saveSuccess.set('Se ha enviado un código de verificación de 6 dígitos a tu correo.');
    } catch (error: any) {
      const msg = error?.error?.message || error?.error?.error || 'Error al enviar el código de verificación.';
      this.saveError.set(msg);
    } finally {
      this.enviandoCodigo.set(false);
    }
  }

  async onSavePassword(): Promise<void> {
    if (this.seguridadForm.invalid) {
      this.seguridadForm.markAllAsTouched();
      return;
    }

    const user = this.usuario();
    if (!user || !user.email) return;

    this.isSaving.set(true);
    this.clearMessages();

    try {
      const { codigo_verificacion, password_nuevo } = this.seguridadForm.value;
      await firstValueFrom(
        this.authService.resetPassword({
          identifier: user.email,
          code: codigo_verificacion,
          new_password: password_nuevo
        })
      );
      this.saveSuccess.set('Contraseña actualizada correctamente.');
      this.seguridadForm.reset();
      this.codigoEnviado.set(false);
    } catch (error: any) {
      const msg = error?.error?.message || error?.error?.error || 'Error al actualizar la contraseña.';
      this.saveError.set(msg);
    } finally {
      this.isSaving.set(false);
    }
  }

  togglePasswordNuevo(): void {
    this.showPasswordNuevo.update(v => !v);
  }

  togglePasswordConfirmar(): void {
    this.showPasswordConfirmar.update(v => !v);
  }

  // ── Helpers ─────────────────────────────────────────────────────
  get currentPhotoSrc(): string {
    return (
      this.previewUrl() ||
      this.usuario()?.foto_perfil ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(this.usuario()?.nombre || 'U')}&background=3c818a&color=fff`
    );
  }

  get charCount(): number {
    return this.perfilForm.get('bio')?.value?.length ?? 0;
  }

  getError(form: FormGroup, field: string): string {
    const ctrl = form.get(field);
    if (!ctrl?.touched || !ctrl.invalid) return '';
    if (ctrl.errors?.['required']) return 'Este campo es requerido.';
    if (ctrl.errors?.['email']) return 'Ingresa un email válido.';
    if (ctrl.errors?.['minlength']) return `Mínimo ${ctrl.errors['minlength'].requiredLength} caracteres.`;
    if (ctrl.errors?.['maxlength']) return `Máximo ${ctrl.errors['maxlength'].requiredLength} caracteres.`;
    return 'Valor inválido.';
  }
}
