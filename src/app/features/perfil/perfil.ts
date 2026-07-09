import { Component, OnInit, signal, inject, effect, computed } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PetService } from '../../core/services/pet.service';
import { UserService } from '../../core/services/user.service';
import { CloudinaryService } from '../../core/services/cloudinary.service';
import { FlagService } from '../../core/services/flag.service';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';
import { PostCardSocialComponent } from '../../shared/components/post-card-social/post-card-social';
import { FlagModalComponent } from '../../shared/components/flag-modal/flag-modal';
import { OptionsDropdownComponent, DropdownOption } from '../../shared/components/options-dropdown/options-dropdown';
import { Tabs, TabOption } from '../../shared/components/tabs/tabs';
import { PetReport } from '../../core/models/pet.model';
import { MotivoDenuncia } from '../../core/models/flag.model';
import { firstValueFrom } from 'rxjs';

type ProfileTab = 'creados' | 'likes' | 'compartidos';

@Component({
  selector: 'app-perfil-page',
  imports: [
    RouterModule,
    Navbar,
    Footer,
    PostCardSocialComponent,
    FlagModalComponent,
    OptionsDropdownComponent,
    Tabs
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class PerfilComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly petService = inject(PetService);
  private readonly userService = inject(UserService);
  private readonly cloudinaryService = inject(CloudinaryService);
  private readonly flagService = inject(FlagService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Perfil que se está visualizando (puede ser el propio o el ajeno)
  perfilUsuario = signal<any>(null);
  esPerfilPropio = signal<boolean>(true);

  // Usuario autenticado
  usuario = this.authService.usuario;

  // Pestaña activa
  activeTab = signal<ProfileTab>('creados');

  // Denuncias
  isFlagModalOpen = signal<boolean>(false);
  flagTarget = signal<{
    type: 'reporte' | 'comentario' | 'perfil';
    id: string;
    label: string;
  } | null>(null);
  flagMotivo = signal<MotivoDenuncia>('spam');
  flagDescripcion = signal<string>('');
  isSendingFlag = signal<boolean>(false);

  menuItems: DropdownOption[] = [
    { label: 'Denunciar perfil', icon: 'flag', value: 'flag', danger: true },
  ];

  tabOptions = computed<TabOption[]>(() => {
    return [
      {
        label: this.esPerfilPropio() ? 'Mis Publicaciones' : 'Publicaciones',
        value: 'creados',
        icon: 'pets',
        count: this.userReports().length
      },
      {
        label: 'Guardados',
        value: 'likes',
        icon: 'bookmark',
        count: this.likedReports().length
      },
      {
        label: 'Compartidos',
        value: 'compartidos',
        icon: 'share',
        count: this.sharedReports().length
      }
    ];
  });

  // Listas de datos reactivas
  userReports = signal<PetReport[]>([]);
  likedReports = signal<PetReport[]>([]);
  sharedReports = signal<PetReport[]>([]);

  isLoading = signal<boolean>(false);
  isUploadingAvatar = signal<boolean>(false);

  constructor() {
    // Efecto reactivo para cargar los datos correctos cada vez que cambia la pestaña o el usuario
    effect(() => {
      const tab = this.activeTab();
      const user = this.perfilUsuario();
      if (user) {
        this.cargarDatos(tab);
      }
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(async (params) => {
      const id = params.get('id');
      const userLogueado = this.authService.usuario();

      if (id && id !== userLogueado?.id_usuario) {
        this.esPerfilPropio.set(false);
        this.isLoading.set(true);
        try {
          const otherUser = await this.userService.getUsuarioById(id);
          if (otherUser) {
            const u = otherUser.data || otherUser;
            this.perfilUsuario.set(u);
          } else {
            this.perfilUsuario.set(null);
          }
        } catch (err) {
          console.error('Error al cargar perfil ajeno:', err);
          this.perfilUsuario.set(null);
        } finally {
          this.isLoading.set(false);
        }
      } else {
        this.esPerfilPropio.set(true);
        if (userLogueado) {
          this.perfilUsuario.set(userLogueado);
          try {
            const freshUser = await this.userService.getUsuarioById(userLogueado.id_usuario);
            if (freshUser) {
              const u = freshUser.data || freshUser;
              this.perfilUsuario.set(u);
            }
          } catch (err) {
            console.error('Error al refrescar perfil propio:', err);
          }
        }
      }
    });
  }

  async cargarDatos(tab: ProfileTab): Promise<void> {
    const user = this.perfilUsuario();
    if (!user || !user.id_usuario) return;

    this.isLoading.set(true);
    try {
      if (tab === 'creados') {
        const reports = await this.petService.getReportesCreados(user.id_usuario);
        this.userReports.set(reports);
      } else if (tab === 'likes') {
        const reports = await this.petService.getReportesGustados(user.id_usuario);
        this.likedReports.set(reports);
      } else if (tab === 'compartidos') {
        const reports = await this.petService.getReportesCompartidos(user.id_usuario);
        this.sharedReports.set(reports);
      }
    } catch (err) {
      console.error(`Error al cargar publicaciones (${tab}):`, err);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Cambiar pestaña activa
  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }

  // Verifica si el usuario actual es dueño del post
  esDueno(report: PetReport): boolean {
    return report.usuario?.id_usuario === this.usuario()?.id_usuario;
  }

  // Marcar una mascota como reunida con su familia (estado = 4)
  async marcarComoReunido(idReporte: string): Promise<void> {
    try {
      // Actualización reactiva optimista local
      const updateList = (list: PetReport[]) =>
        list.map((r) => (r.id_reporte_mascota === idReporte ? { ...r, estado: 4 } : r));

      this.userReports.update(updateList);
      this.likedReports.update(updateList);
      this.sharedReports.update(updateList);

      await this.petService.updateReporte(idReporte, { estado: 4 });
    } catch (err) {
      console.error('Error al marcar como reunido:', err);
    }
  }

  // Eliminar el reporte del sistema
  async eliminarReporte(idReporte: string): Promise<void> {
    if (!confirm('¿Estás seguro de que deseas eliminar este reporte permanentemente?')) {
      return;
    }

    try {
      // Remoción reactiva optimista local
      const filterList = (list: PetReport[]) =>
        list.filter((r) => r.id_reporte_mascota !== idReporte);

      this.userReports.update(filterList);
      this.likedReports.update(filterList);
      this.sharedReports.update(filterList);

      await this.petService.deleteReporte(idReporte);
    } catch (err) {
      console.error('Error al eliminar reporte:', err);
    }
  }

  // Quitar el reporte de los compartidos
  async quitarCompartido(idReporte: string, event: Event): Promise<void> {
    event.stopPropagation();
    if (!confirm('¿Deseas quitar este reporte de tus compartidos?')) {
      return;
    }

    try {
      this.sharedReports.update((prev) => prev.filter((r) => r.id_reporte_mascota !== idReporte));
      await this.petService.descompartirReporte(idReporte);
    } catch (err) {
      console.error('Error al quitar compartido:', err);
    }
  }

  // Seleccionar y subir foto de perfil a Cloudinary
  async onAvatarSelected(event: any): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    const user = this.usuario();
    if (!user || !user.id_usuario) return;

    this.isUploadingAvatar.set(true);

    try {
      const secureUrl = await this.cloudinaryService.uploadImage(
        file,
        `usuarios/${user.id_usuario}/perfil`,
      );
      await this.userService.updateUsuario(user.id_usuario, { foto_perfil: secureUrl });
      this.authService.patchUsuario({ foto_perfil: secureUrl });
      await firstValueFrom(this.authService.refreshUser());
    } catch (err: any) {
      console.error('Error al actualizar avatar:', err);
      alert(err.message || 'Hubo un error al actualizar la foto de perfil.');
    } finally {
      this.isUploadingAvatar.set(false);
    }
  }

  onReportChange(updated: PetReport): void {
    const updateFn = (list: PetReport[]) =>
      list.map((r) =>
        r.id_reporte_mascota === updated.id_reporte_mascota ? { ...r, ...updated } : r,
      );
    this.userReports.update(updateFn);
    this.likedReports.update(updateFn);
    this.sharedReports.update(updateFn);
  }

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

  onFlagComment(c: any): void {
    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (!c.id_comentario) return;

    this.flagTarget.set({
      type: 'comentario',
      id: c.id_comentario,
      label: `Comentario de ${c.usuario_nombre || 'Usuario'}`,
    });
    this.flagMotivo.set('spam');
    this.flagDescripcion.set('');
    this.isFlagModalOpen.set(true);
  }

  onPostDeleted(idReporte: string): void {
    const filterFn = (list: PetReport[]) => list.filter((r) => r.id_reporte_mascota !== idReporte);
    this.userReports.update(filterFn);
    this.likedReports.update(filterFn);
    this.sharedReports.update(filterFn);
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
      alert('Tu reporte ha sido enviado. Gracias por ayudar a la comunidad.');
      this.closeFlagModal();
    } catch (error: any) {
      console.error('Error al enviar la denuncia:', error);
      alert(error?.error?.error || 'No se pudo enviar la denuncia.');
    } finally {
      this.isSendingFlag.set(false);
    }
  }

  handleMenuAction(option: DropdownOption): void {
    if (option.value === 'flag') {
      this.onFlagProfile();
    }
  }

  onFlagProfile(): void {
    const user = this.perfilUsuario();
    if (!this.usuario()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (!user) return;

    this.flagTarget.set({
      type: 'perfil',
      id: user.id_usuario,
      label: `Perfil de ${user.nombre || 'Usuario'}`,
    });
    this.flagMotivo.set('spam');
    this.flagDescripcion.set('');
    this.isFlagModalOpen.set(true);
  }

  logout(): void {
    this.authService.logout();
  }

  crearReporte(): void {
    this.router.navigate(['/pets/report']);
  }
}
