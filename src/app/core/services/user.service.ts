import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, of, tap } from 'rxjs';
import { ConfigService } from './config.service';
import { UserGeoPreferences, RawUserGeoResponse, UsuarioMencion } from '../models/user.model';

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
   * Obtiene los detalles de un usuario por su ID.
   * Endpoint: GET /api/v1/usuarios/{id}
   */
  async getUsuarioById(id: string): Promise<any> {
    try {
      return await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/usuarios/${id}`)
      );
    } catch (error) {
      console.error(`Error al obtener detalles del usuario ${id}:`, error);
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
  async updatePassword(id: string, telefono: string, passwordNuevo: string): Promise<any> {
    return await firstValueFrom(
      this.http.put<any>(`${this.apiUrl}/usuarios/${id}/password`, {
        password: passwordNuevo,
        telefono: telefono
      })
    );
  }

  private _mentionsCache = new Map<string, UsuarioMencion[]>();

  searchMentions(q: string): Observable<UsuarioMencion[]> {
    const cleanQuery = q.trim().toLowerCase();
    if (this._mentionsCache.has(cleanQuery)) {
      return of(this._mentionsCache.get(cleanQuery)!);
    }
    return this.http.get<UsuarioMencion[]>(`${this.apiUrl}/usuarios/menciones`, { params: { q } }).pipe(
      tap(users => this._mentionsCache.set(cleanQuery, users))
    );
  }
}
