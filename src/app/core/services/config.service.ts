import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly STORAGE_KEY = 'api_use_local_dev';
  
  // Detecta producción basándose en el hostname
  readonly isProduction = this.isBrowser 
    ? !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
    : true;
  
  // URLs de API configuradas para producción y local
  private readonly REMOTE_URL = 'https://huellas-huellitas-azqcbz-97edbd-161-132-53-85.sslip.io/api/v1';
  private readonly LOCAL_URL = 'http://localhost:8081/api/v1';
  
  // Signal reactivo para alternar a local en desarrollo/pruebas
  readonly useLocalDev = signal<boolean>(this.loadInitialState());
  
  // Signal computado reactivamente para la URL de la API
  readonly apiUrl = computed(() => {
    if (this.isProduction) return this.REMOTE_URL;
    return this.useLocalDev() ? this.LOCAL_URL : this.REMOTE_URL;
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
