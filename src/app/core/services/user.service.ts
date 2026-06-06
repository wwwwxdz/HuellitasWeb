import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';
import { UserGeoPreferences, RawUserGeoResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);
  
  private get apiUrl(): string {
    return this.configService.apiUrl();
  }

  /**
   * Parsea la ubicación del usuario y la normaliza a { lat, lng, radio_km }.
   * Si el usuario no tiene ubicación configurada, devuelve null.
   */
  parseUserGeoPreferences(raw: any): UserGeoPreferences | null {
    if (!raw) return null;

    const lat = raw.latitud !== undefined && raw.latitud !== null ? Number(raw.latitud) : null;
    const lng = raw.longitud !== undefined && raw.longitud !== null ? Number(raw.longitud) : null;
    const radio = raw.radio !== undefined && raw.radio !== null ? Number(raw.radio) : null;

    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return null;

    const radio_km = radio && radio > 0 ? Math.round(radio / 1000) : 10;

    return { lat, lng, radio_km };
  }

  /**
   * Obtiene las preferencias geográficas del usuario autenticado.
   * Llama a GET /users/me (o /auth/me según la API).
   */
  async getGeoPreferences(): Promise<UserGeoPreferences | null> {
    try {
      const raw = await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/auth/me`)
      );
      return this.parseUserGeoPreferences(raw);
    } catch {
      return null;
    }
  }

  /**
   * Actualiza los datos del perfil de un usuario.
   * Endpoint: PUT /api/v1/usuarios/{id}
   */
  async updateUsuario(id: string, datos: Partial<any>): Promise<any> {
    return await firstValueFrom(
      this.http.put<any>(`${this.apiUrl}/usuarios/${id}`, datos)
    );
  }

  /**
   * Actualiza la contraseña del usuario.
   * Endpoint: PUT /api/v1/usuarios/{id}/password
   */
  async updatePassword(id: string, passwordActual: string, passwordNuevo: string): Promise<any> {
    return await firstValueFrom(
      this.http.put<any>(`${this.apiUrl}/usuarios/${id}/password`, {
        password_actual: passwordActual,
        password_nuevo: passwordNuevo
      })
    );
  }
}
