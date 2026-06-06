import { Component, OnInit, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PetService } from '../../core/services/pet.service';
import { UserService } from '../../core/services/user.service';
import { CloudinaryService } from '../../core/services/cloudinary.service';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';
import { PetReport } from '../../core/models/pet.model';

type ProfileTab = 'creados' | 'likes' | 'compartidos';

@Component({
  selector: 'app-perfil-page',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar, Footer],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class PerfilComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly petService = inject(PetService);
  private readonly userService = inject(UserService);
  private readonly cloudinaryService = inject(CloudinaryService);
  private readonly router = inject(Router);

  // Acceder a señales globales
  usuario = this.authService.usuario;
  
  // Pestaña activa
  activeTab = signal<ProfileTab>('creados');

  // Listas de datos reactivas
  userReports = signal<PetReport[]>([]);
  likedReports = signal<PetReport[]>([]);
  sharedReports = signal<PetReport[]>([]);

  isLoading = signal<boolean>(false);
  isUploadingAvatar = signal<boolean>(false);

  constructor() {
    // Efecto reactivo para cargar los datos correctos cada vez que cambia la pestaña
    effect(() => {
      const tab = this.activeTab();
      this.cargarDatos(tab);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // La carga se realiza de manera reactiva mediante el effect del constructor
  }

  async cargarDatos(tab: ProfileTab): Promise<void> {
    const user = this.usuario();
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
        list.map(r => r.id_reporte_mascota === idReporte ? { ...r, estado: 4 } : r);

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
        list.filter(r => r.id_reporte_mascota !== idReporte);

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
      this.sharedReports.update(prev => prev.filter(r => r.id_reporte_mascota !== idReporte));
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
      const secureUrl = await this.cloudinaryService.uploadImage(file, 'perfiles');
      await this.userService.updateUsuario(user.id_usuario, { foto_perfil: secureUrl });
      this.authService.patchUsuario({ foto_perfil: secureUrl });
    } catch (err: any) {
      console.error('Error al actualizar avatar:', err);
      alert(err.message || 'Hubo un error al actualizar la foto de perfil.');
    } finally {
      this.isUploadingAvatar.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
  }

  crearReporte(): void {
    this.router.navigate(['/pets/report']);
  }
}
