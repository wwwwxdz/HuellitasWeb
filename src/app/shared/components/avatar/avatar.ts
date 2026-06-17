import { Component, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss'
})
export class AvatarComponent {
  src = input<string | null | undefined>(null);
  name = input<string>('Usuario');
  size = input<number>(40);

  imageError = signal<boolean>(false);

  constructor() {
    // Cuando cambie la URL de la imagen, reseteamos el estado de error de la imagen
    effect(() => {
      this.src(); // leemos el signal reactivo src
      this.imageError.set(false);
    });
  }

  // Determinar si debemos mostrar el fallback de iniciales
  showFallback = computed(() => {
    return !this.src() || this.imageError();
  });

  // Extraer las iniciales del nombre
  initials = computed(() => {
    const rawName = this.name().trim();
    if (!rawName) return '?';
    const parts = rawName.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  });

  // Generar un fondo aleatorio consistente basado en el nombre de usuario
  backgroundStyle = computed(() => {
    const nameStr = this.name();
    let hash = 0;
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    // HSL es ideal para asegurar colores vibrantes pero no excesivamente oscuros/claros
    const h = Math.abs(hash % 360);
    const s = 65; // saturación fija
    const l = 45; // luminosidad fija
    
    // Gradiente sutil
    const color1 = `hsl(${h}, ${s}%, ${l}%)`;
    const color2 = `hsl(${(h + 40) % 360}, ${s}%, ${l - 5}%)`;
    return {
      background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`
    };
  });

  onImageError(): void {
    this.imageError.set(true);
  }
}
