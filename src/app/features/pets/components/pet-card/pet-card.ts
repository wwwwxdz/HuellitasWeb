import { Component, input, signal, inject, effect } from '@angular/core';
import { PetService } from '../../../../core/services/pet.service';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-pet-card',
  standalone: true,
  imports: [],
  templateUrl: './pet-card.html',
  styleUrl: './pet-card.scss'
})
export class PetCard {
  private readonly petService = inject(PetService);
  private readonly authService = inject(AuthService);

  id = input.required<string>();
  name = input<string>('Sin nombre');
  image = input<string>('/images/lost-max.png');
  status = input<'perdido' | 'avistado' | 'encontrado' | 'reunido'>('perdido');
  timeAgo = input<string>('');
  createdAt = input<string>('');
  location = input<string>('');
  tags = input<string[]>([]);
  hasReward = input<boolean>(false);
  montoRecompensa = input<number>(0);
  
  // Likes inputs
  likesCount = input<number>(0);
  liked = input<boolean>(false);

  // Likes local state
  localLikesCount = signal<number>(0);
  localLiked = signal<boolean>(false);

  constructor() {
    // Sincronizar estado inicial con los inputs
    effect(() => {
      this.localLikesCount.set(this.likesCount());
    });
    effect(() => {
      this.localLiked.set(this.liked());
    });
  }

  get formattedTimeAgo(): string {
    const dateStr = this.createdAt();
    if (!dateStr) {
      const fallback = this.timeAgo();
      return fallback ? fallback.charAt(0).toUpperCase() + fallback.slice(1) : '';
    }

    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    const verb = this.status() === 'encontrado' ? 'encontrado' : 
                 this.status() === 'avistado' ? 'avistado' : 
                 this.status() === 'reunido' ? 'reunido' : 'perdido';

    let result = '';
    if (days === 0) {
      if (hours === 0) {
        result = `${verb} hoy (hace ${mins} min)`;
      } else {
        result = `${verb} hoy (hace ${hours}h)`;
      }
    } else if (days === 1) {
      result = `${verb} ayer`;
    } else {
      result = `${verb} hace ${days} días`;
    }

    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  get formattedLocation(): string {
    const loc = this.location();
    if (!loc) return '';

    // Dividir por comas y recortar espacios en blanco de cada parte
    const parts = loc.split(',').map(p => p.trim()).filter(Boolean);

    // Filtrar partes no deseadas como códigos postales o país "Perú"
    const cleanedParts = parts.filter(p => {
      const lower = p.toLowerCase();
      if (lower === 'perú' || lower === 'peru') return false;
      if (/^\d+$/.test(lower)) return false; // si es solo números (código postal)
      return true;
    });

    // Si tiene más de 3 partes, quedarnos solo con las primeras 3 (urbanización, barrio, distrito)
    if (cleanedParts.length > 3) {
      return cleanedParts.slice(0, 3).join(', ');
    }

    return cleanedParts.join(', ');
  }

  get statusLabel(): string {
    const labels = {
      perdido: 'Perdido',
      avistado: 'Avistado',
      encontrado: 'Encontrado',
      reunido: 'Reunido'
    };
    return labels[this.status()] || 'Desconocido';
  }

  get statusColorClass(): string {
    const colors = {
      perdido: 'red',
      avistado: 'green',
      encontrado: 'blue',
      reunido: 'grey'
    };
    return colors[this.status()] || 'blue';
  }

  get statusIcon(): string {
    const icons = {
      perdido: 'error',
      avistado: 'visibility',
      encontrado: 'check_circle',
      reunido: 'task_alt'
    };
    return icons[this.status()] || 'error';
  }

  handleShare(): void {
    const petName = this.name();
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `Reporte de ${petName} - Huellitas`,
        text: `Ayúdanos a encontrar o reportar a esta mascota.`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert(`Enlace copiado para compartir el reporte de ${petName}`);
    }
  }

  handleSave(): void {
    alert(`Reporte de ${this.name()} guardado en tus favoritos (Simulado).`);
  }

  handleContact(): void {
    alert(`Abriendo chat para contactar al guardián de ${this.name()} (Simulado).`);
  }

  async handleLike(): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      alert('Debes iniciar sesión para dar "Me gusta" a las publicaciones.');
      return;
    }

    // Toggle optimista local
    const likedBefore = this.localLiked();
    const countBefore = this.localLikesCount();

    this.localLiked.set(!likedBefore);
    this.localLikesCount.set(likedBefore ? countBefore - 1 : countBefore + 1);

    try {
      const res = await this.petService.toggleLike(this.id());
      // Sincronizar con el resultado real del backend
      this.localLiked.set(res.liked_por_usuario);
      this.localLikesCount.set(res.total_likes);
    } catch (error) {
      console.error('Error al dar like en backend, revirtiendo estado:', error);
      // Revertir en caso de fallo
      this.localLiked.set(likedBefore);
      this.localLikesCount.set(countBefore);
    }
  }
}
