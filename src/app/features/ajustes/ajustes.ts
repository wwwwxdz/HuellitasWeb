import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UserService } from '../../core/services/user.service';
import { CloudinaryService } from '../../core/services/cloudinary.service';
import { LocationService } from '../../core/services/location.service';
import { MapComponent } from '../../features/pets/components/map-component/map-component';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';
import * as ubigeo from 'ubigeo-peru';
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

type SettingsTab = 'perfil' | 'cuenta' | 'seguridad';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Navbar, Footer, MapComponent],
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.scss',
})
export class AjustesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly cloudinaryService = inject(CloudinaryService);
  private readonly locationService = inject(LocationService);
  private readonly fb = inject(FormBuilder);

  // Estado reactivo
  usuario = this.authService.usuario;
  activeTab = signal<SettingsTab>('perfil');
  isSaving = signal(false);
  isUploadingPhoto = signal(false);
  saveSuccess = signal<string | null>(null);
  saveError = signal<string | null>(null);
  previewUrl = signal<string | null>(null);

  // Formulario de perfil
  perfilForm!: FormGroup;
  // Formulario de seguridad (contraseña)
  seguridadForm!: FormGroup;

  // Preferencias de Ubicación del Ubigeo
  departamentos = signal<SelectOption[]>([]);
  provincias = signal<SelectOption[]>([]);
  distritos = signal<SelectOption[]>([]);
  currentAddress = signal<string>('Haz clic en el mapa para obtener la dirección descriptiva');

  ngOnInit(): void {
    this.buildForms();
    this.initUbigeo();
    this.patchPerfilForm();
    this.setupListeners();
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
        password_actual: ['', [Validators.required, Validators.minLength(6)]],
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
    try {
      const list = (ubigeo as unknown as UbigeoData).reniec
        .filter((i: UbigeoItem) => i.provincia === '00' && i.distrito === '00')
        .map((i: UbigeoItem) => ({ value: i.nombre, label: i.nombre }));
      this.departamentos.set(list);
    } catch (err) {
      console.error('Error al inicializar ubigeo:', err);
    }
  }

  private setupListeners(): void {
    this.perfilForm.get('departamento')?.valueChanges.subscribe(deptName => {
      if (!deptName) {
        this.provincias.set([]);
        this.distritos.set([]);
        this.perfilForm.patchValue({ provincia: '', distrito: '' }, { emitEvent: false });
        return;
      }
      const dept = (ubigeo as unknown as UbigeoData).reniec.find((i: UbigeoItem) => i.nombre === deptName && i.provincia === '00');
      const deptCode = dept?.departamento || '';
      
      const provs = (ubigeo as unknown as UbigeoData).reniec
        .filter((i: UbigeoItem) => i.departamento === deptCode && i.provincia !== '00' && i.distrito === '00')
        .map((i: UbigeoItem) => ({ value: i.nombre, label: i.nombre }));
      this.provincias.set(provs);
      
      this.perfilForm.patchValue({ provincia: '', distrito: '' }, { emitEvent: false });
      this.distritos.set([]);
    });

    this.perfilForm.get('provincia')?.valueChanges.subscribe(provName => {
      if (!provName) {
        this.distritos.set([]);
        this.perfilForm.patchValue({ distrito: '' }, { emitEvent: false });
        return;
      }
      const deptName = this.perfilForm.get('departamento')?.value;
      const dept = (ubigeo as unknown as UbigeoData).reniec.find((i: UbigeoItem) => i.nombre === deptName && i.provincia === '00');
      const deptCode = dept?.departamento || '';

      const prov = (ubigeo as unknown as UbigeoData).reniec.find((i: UbigeoItem) => 
        i.departamento === deptCode && i.nombre === provName && i.distrito === '00'
      );
      const provCode = prov?.provincia || '';

      const dists = (ubigeo as unknown as UbigeoData).reniec
        .filter((i: UbigeoItem) => i.departamento === deptCode && i.provincia === provCode && i.distrito !== '00')
        .map((i: UbigeoItem) => ({ value: i.nombre, label: i.nombre }));
      this.distritos.set(dists);

      this.perfilForm.patchValue({ distrito: '' }, { emitEvent: false });
    });
  }

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

    if (u.departamento) {
      const dept = (ubigeo as unknown as UbigeoData).reniec.find((i: UbigeoItem) => i.nombre === u.departamento && i.provincia === '00');
      if (dept) {
        const provs = (ubigeo as unknown as UbigeoData).reniec
          .filter((i: UbigeoItem) => i.departamento === dept.departamento && i.provincia !== '00' && i.distrito === '00')
          .map((i: UbigeoItem) => ({ value: i.nombre, label: i.nombre }));
        this.provincias.set(provs);

        if (u.provincia) {
          const prov = (ubigeo as unknown as UbigeoData).reniec.find((i: UbigeoItem) => 
            i.departamento === dept.departamento && i.nombre === u.provincia && i.distrito === '00'
          );
          if (prov) {
            const dists = (ubigeo as unknown as UbigeoData).reniec
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

    this.isSaving.set(true);
    this.clearMessages();

    try {
      const { foto_perfil, ...data } = this.perfilForm.value;
      
      if (data.latitud !== null && data.latitud !== undefined) {
        data.latitud = Number(data.latitud);
      }
      if (data.longitud !== null && data.longitud !== undefined) {
        data.longitud = Number(data.longitud);
      }
      if (data.radio !== null && data.radio !== undefined) {
        data.radio = Number(data.radio);
      }

      await this.userService.updateUsuario(user.id_usuario, data);
      await firstValueFrom(this.authService.refreshUser());
      this.saveSuccess.set('Datos guardados correctamente.');
    } catch {
      this.saveError.set('No se pudieron guardar los cambios. Inténtalo de nuevo.');
    } finally {
      this.isSaving.set(false);
    }
  }

  // ── Cambio de contraseña ────────────────────────────────────────
  async onSavePassword(): Promise<void> {
    if (this.seguridadForm.invalid) {
      this.seguridadForm.markAllAsTouched();
      return;
    }

    const user = this.usuario();
    if (!user) return;

    this.isSaving.set(true);
    this.clearMessages();

    try {
      const { password_actual, password_nuevo } = this.seguridadForm.value;
      await this.userService.updatePassword(
        user.id_usuario,
        password_actual,
        password_nuevo
      );
      this.saveSuccess.set('Contraseña actualizada correctamente.');
      this.seguridadForm.reset();
    } catch (error: any) {
      const msg = error?.error?.error || 'Contraseña actual incorrecta o error al actualizar.';
      this.saveError.set(msg);
    } finally {
      this.isSaving.set(false);
    }
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
