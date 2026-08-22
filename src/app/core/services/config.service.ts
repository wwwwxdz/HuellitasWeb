import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly STORAGE_KEY = 'api_use_local_dev';

  readonly isProduction = environment.production;

  // Facebook Config desde el entorno activo
  readonly fbToken = computed(() => environment.fbToken);
  readonly fbPageId = computed(() => environment.fbPageId);

  // Signal reactivo para alternar a local en desarrollo/pruebas
  readonly useLocalDev = signal<boolean>(this.loadInitialState());

  // Signal computado reactivamente para la URL de la API
  readonly apiUrl = computed(() => {
    if (this.isProduction) return environment.apiUrl;
    return this.useLocalDev() ? environment.apiUrl : environment.remoteApiUrl;
  });

  private loadInitialState(): boolean {
    if (this.isProduction) return false;
    if (!this.isBrowser) return false;
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? stored === 'true' : true;
  }

  /**
   * Cambia el backend activo en el entorno de desarrollo/pruebas.
   * @param useLocal true para usar el localhost, false para el backend remoto.
   */
  toggleEnvironment(useLocal: boolean): void {
    if (this.isProduction) return;

    this.useLocalDev.set(useLocal);
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, String(useLocal));
    }
  }
}
