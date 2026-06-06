import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';
import { Denuncia, DenunciaPayload } from '../models/flag.model';

@Injectable({
  providedIn: 'root'
})
export class FlagService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);
  
  private get apiUrl(): string {
    return this.configService.apiUrl();
  }

  /**
   * Crea una nueva denuncia (reporte, comentario, perfil, chat).
   * Endpoint: POST /api/v1/denuncias
   */
  async crearDenuncia(payload: DenunciaPayload): Promise<Denuncia> {
    return await firstValueFrom(
      this.http.post<Denuncia>(`${this.apiUrl}/denuncias`, payload)
    );
  }
}
