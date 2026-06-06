import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  
  // Guardamos el tema actual en un Signal. Por defecto es 'dark'.
  theme = signal<Theme>('dark');

  constructor() {
    // Solo accedemos a localStorage y document si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem('huellitas_theme') as Theme;
      if (savedTheme) {
        this.theme.set(savedTheme);
      } else {
        const systemPreference = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        this.theme.set(systemPreference);
      }
    }

    // Efecto para actualizar el body cada vez que el Signal del tema cambia
    effect(() => {
      const currentTheme = this.theme();
      if (isPlatformBrowser(this.platformId)) {
        document.body.setAttribute('data-theme', currentTheme);
        localStorage.setItem('huellitas_theme', currentTheme);
      }
    });
  }

  toggleTheme(): void {
    this.theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
  }
}
