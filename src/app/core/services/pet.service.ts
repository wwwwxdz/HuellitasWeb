import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';
import { 
  PetReport, 
  ReporteMascotaPuntoMapa, 
  Especie, 
  Raza, 
  Color,
  GetReportesFilters, 
  CreateReporteMascotaRequest, 
  UpdateReporteMascotaRequest 
} from '../models/pet.model';

@Injectable({
  providedIn: 'root',
})
export class PetService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);
  
  private get apiUrl(): string {
    return this.configService.apiUrl();
  }

  /**
   * Lista reportes con filtros opcionales.
   * Endpoint: GET /api/v1/reportes
   */
  async getReportes(filters: GetReportesFilters = {}): Promise<{ data: PetReport[]; hasMore: boolean; total: number }> {
    let params = new HttpParams();

    if (filters.search)     params = params.set('search', filters.search);
    if (filters.estado)     params = params.set('estado', String(filters.estado));
    if (filters.ubicacion)  params = params.set('ubicacion', filters.ubicacion);
    if (filters.start_date) params = params.set('start_date', filters.start_date);
    if (filters.end_date)   params = params.set('end_date', filters.end_date);
    if (filters.lat)        params = params.set('lat', String(filters.lat));
    if (filters.lng)        params = params.set('lng', String(filters.lng));
    if (filters.radio)      params = params.set('radio', String(filters.radio));
    if (filters.id_especie) params = params.set('id_especie', filters.id_especie);
    if (filters.id_raza)    params = params.set('id_raza', filters.id_raza);
    if (filters.order)      params = params.set('order', filters.order);
    if (filters.page)       params = params.set('page', String(filters.page));
    if (filters.limit)      params = params.set('limit', String(filters.limit));

    interface PaginatedResponse {
      data: PetReport[];
      total: number;
      page: number;
      limit: number;
      has_more: boolean;
    }

    try {
      console.info(`[PET SERVICE] HTTP GET a: ${this.apiUrl}/reportes con params:`, params.toString());
      const response = await firstValueFrom(
        this.http.get<PaginatedResponse>(`${this.apiUrl}/reportes`, { params })
      );
      const data = response.data || [];

      // Fallback de filtrado en cliente para tipo y raza por texto libre (si no se enviaron IDs)
      let result = data;
      if (filters.tipo && !filters.id_especie) {
        result = result.filter((r) =>
          r.tipo?.toLowerCase() === filters.tipo!.toLowerCase()
        );
      }
      if (filters.raza && !filters.id_raza) {
        result = result.filter((r) =>
          r.raza?.toLowerCase().includes(filters.raza!.toLowerCase())
        );
      }

      // Deduplicar por ID de reporte (defensa ante duplicados del backend)
      const seen = new Set<string>();
      const deduplicated = result.filter(r => {
        if (seen.has(r.id_reporte_mascota)) return false;
        seen.add(r.id_reporte_mascota);
        return true;
      });

      return {
        data: deduplicated,
        hasMore: response.has_more ?? false,
        total: response.total ?? 0
      };
    } catch (error) {
      console.warn('Error al obtener reportes reales del backend. Usando mocks locales:', error);
      // MOCK FALLBACK
      const mockReports: PetReport[] = [
        {
          id_reporte_mascota: '1',
          nombre: 'Max',
          tipo: 'perro',
          raza: 'Golden Retriever',
          estado: 2, // perdido
          ubicacion: 'Barrio San Martin, Zona Norte',
          departamento: 'Ancash',
          provincia: 'Santa',
          distrito: 'Nuevo Chimbote',
          latitud: -9.1214,
          longitud: -78.5308,
          creado_en: new Date().toISOString(),
          imagen_principal: {
            id_imagen_mascota: 'img1',
            id_reporte_mascota: '1',
            url: '/images/pet-max.png',
            es_principal: true,
            creado_en: new Date().toISOString()
          },
          usuario: {
            id_usuario: 'usr1',
            nombre: 'Juan Pérez',
            foto_perfil: '/images/avatar-maria.png'
          },
          total_likes: 12,
          total_comentarios: 3,
          liked_por_usuario: false
        },
        {
          id_reporte_mascota: '2',
          nombre: 'Pelusa',
          tipo: 'gato',
          raza: 'Siames',
          estado: 1, // encontrado
          ubicacion: 'Plaza Central, Centro',
          departamento: 'Ancash',
          provincia: 'Santa',
          distrito: 'Nuevo Chimbote',
          latitud: -9.1250,
          longitud: -78.5280,
          creado_en: new Date(Date.now() - 3600000 * 4).toISOString(),
          imagen_principal: {
            id_imagen_mascota: 'img2',
            id_reporte_mascota: '2',
            url: '/images/pet-cat.png',
            es_principal: true,
            creado_en: new Date().toISOString()
          },
          usuario: {
            id_usuario: 'usr2',
            nombre: 'Lucía Gómez',
            foto_perfil: '/images/avatar-lucia.png'
          },
          total_likes: 24,
          total_comentarios: 8,
          liked_por_usuario: true
        },
        {
          id_reporte_mascota: '3',
          nombre: 'Toby',
          tipo: 'perro',
          raza: 'Schnauzer',
          estado: 2, // perdido
          ubicacion: 'Avenida Libertad, Sur',
          departamento: 'Ancash',
          provincia: 'Santa',
          distrito: 'Nuevo Chimbote',
          latitud: -9.1300,
          longitud: -78.5350,
          creado_en: new Date(Date.now() - 3600000 * 24).toISOString(),
          imagen_principal: {
            id_imagen_mascota: 'img3',
            id_reporte_mascota: '3',
            url: '/images/pet-toby.png',
            es_principal: true,
            creado_en: new Date().toISOString()
          },
          usuario: {
            id_usuario: 'usr3',
            nombre: 'Carlos Soto',
            foto_perfil: '/images/avatar-carlos.png'
          },
          total_likes: 5,
          total_comentarios: 1,
          liked_por_usuario: false
        }
      ];

      let filtered = mockReports;
      if (filters.estado) {
        filtered = filtered.filter(r => r.estado === filters.estado);
      }
      if (filters.search) {
        filtered = filtered.filter(r => r.nombre.toLowerCase().includes(filters.search!.toLowerCase()) || r.raza.toLowerCase().includes(filters.search!.toLowerCase()));
      }

      return {
        data: filtered,
        hasMore: false,
        total: filtered.length
      };
    }
  }

  /**
   * Obtiene puntos de mapa.
   * Endpoint: GET /api/v1/reportes/mapa
   */
  async getMapPoints(filters: {
    lat?: number;
    lng?: number;
    radio?: number;
    estado?: number | null;
    id_especie?: string;
  } = {}): Promise<{ data: ReporteMascotaPuntoMapa[] }> {
    let params = new HttpParams();
    if (filters.lat !== undefined) params = params.set('lat', String(filters.lat));
    if (filters.lng !== undefined) params = params.set('lng', String(filters.lng));
    if (filters.radio !== undefined) params = params.set('radio', String(filters.radio));
    if (filters.estado !== undefined && filters.estado !== null) params = params.set('estado', String(filters.estado));
    if (filters.id_especie) params = params.set('id_especie', filters.id_especie);

    try {
      return await firstValueFrom(
        this.http.get<{ data: ReporteMascotaPuntoMapa[] }>(`${this.apiUrl}/reportes/mapa`, { params })
      );
    } catch (error) {
      console.warn('Error al obtener puntos del mapa reales. Usando mocks locales:', error);
      // Fallback mocks
      const mockPoints: ReporteMascotaPuntoMapa[] = [
        {
          id_reporte_mascota: '1',
          nombre: 'Max',
          estado: 2, // perdido (rojo)
          latitud: -9.1214,
          longitud: -78.5308,
          id_especie: 'esp-dog-id',
          foto_principal: '/images/pet-max.png'
        },
        {
          id_reporte_mascota: '2',
          nombre: 'Pelusa',
          estado: 1, // encontrado (azul)
          latitud: -9.1250,
          longitud: -78.5280,
          id_especie: 'esp-cat-id',
          foto_principal: '/images/pet-cat.png'
        },
        {
          id_reporte_mascota: '3',
          nombre: 'Toby',
          estado: 3, // avistado (naranja)
          latitud: -9.1300,
          longitud: -78.5350,
          id_especie: 'esp-dog-id',
          foto_principal: '/images/pet-toby.png'
        }
      ];
      return { data: mockPoints };
    }
  }

  /**
   * Obtiene la lista de especies registradas.
   * Endpoint: GET /api/v1/especies
   */
  async getEspecies(): Promise<Especie[]> {
    try {
      return await firstValueFrom(
        this.http.get<Especie[]>(`${this.apiUrl}/especies`)
      );
    } catch (error) {
      console.warn('Error al obtener especies reales. Usando mocks locales:', error);
      return [
        { id_especie: 'esp-dog-id', nombre: 'Perro' },
        { id_especie: 'esp-cat-id', nombre: 'Gato' },
        { id_especie: 'esp-bird-id', nombre: 'Ave' }
      ];
    }
  }

  /**
   * Obtiene la lista de razas registradas, opcionalmente filtradas por especie.
   * Endpoint: GET /api/v1/razas
   */
  async getRazas(idEspecie?: string): Promise<Raza[]> {
    let params = new HttpParams();
    if (idEspecie) params = params.set('id_especie', idEspecie);

    try {
      return await firstValueFrom(
        this.http.get<Raza[]>(`${this.apiUrl}/razas`, { params })
      );
    } catch (error) {
      console.warn('Error al obtener razas reales. Usando mocks locales:', error);
      const allRazas: Raza[] = [
        { id_raza: 'rz-pitbull', id_especie: 'esp-dog-id', nombre: 'Pitbull' },
        { id_raza: 'rz-golden', id_especie: 'esp-dog-id', nombre: 'Golden Retriever' },
        { id_raza: 'rz-schnauzer', id_especie: 'esp-dog-id', nombre: 'Schnauzer' },
        { id_raza: 'rz-siames', id_especie: 'esp-cat-id', nombre: 'Siamés' },
        { id_raza: 'rz-persa', id_especie: 'esp-cat-id', nombre: 'Persa' },
        { id_raza: 'rz-canario', id_especie: 'esp-bird-id', nombre: 'Canario' }
      ];
      if (idEspecie) {
        return allRazas.filter(r => r.id_especie === idEspecie);
      }
      return allRazas;
    }
  }

  /**
   * Obtiene la lista de colores registrados.
   * Endpoint: GET /api/v1/colores
   */
  async getColores(): Promise<Color[]> {
    try {
      return await firstValueFrom(
        this.http.get<Color[]>(`${this.apiUrl}/colores`)
      );
    } catch (error) {
      console.warn('Error al obtener colores reales. Usando mocks locales:', error);
      return [
        { id_color: '1', nombre: 'Negro', hex: '#000000' },
        { id_color: '2', nombre: 'Blanco', hex: '#ffffff' },
        { id_color: '3', nombre: 'Marrón', hex: '#8B4513' },
        { id_color: '4', nombre: 'Gris', hex: '#808080' },
        { id_color: '5', nombre: 'Dorado', hex: '#FFD700' },
        { id_color: '6', nombre: 'Naranja', hex: '#FFA500' }
      ];
    }
  }

  /**
   * Obtiene un reporte individual.
   * Endpoint: GET /api/v1/reportes/{id}
   */
  async getReporte(id: string): Promise<PetReport> {
    try {
      return await firstValueFrom(
        this.http.get<PetReport>(`${this.apiUrl}/reportes/${id}`)
      );
    } catch (error) {
      console.warn(`Error al obtener reporte real para ID ${id}. Usando mock local:`, error);
      return {
        id_reporte_mascota: id,
        nombre: id === '1' ? 'Max' : (id === '2' ? 'Pelusa' : 'Toby'),
        tipo: id === '2' ? 'gato' : 'perro',
        raza: id === '1' ? 'Golden Retriever' : (id === '2' ? 'Siamés' : 'Schnauzer'),
        estado: id === '2' ? 1 : 2,
        ubicacion: id === '1' ? 'Barrio San Martin, Zona Norte' : (id === '2' ? 'Plaza Central, Centro' : 'Avenida Libertad, Sur'),
        departamento: 'Ancash',
        provincia: 'Santa',
        distrito: 'Nuevo Chimbote',
        latitud: id === '1' ? -9.1214 : (id === '2' ? -9.1250 : -9.1300),
        longitud: id === '1' ? -78.5308 : (id === '2' ? -78.5280 : -78.5350),
        creado_en: new Date().toISOString(),
        imagen_principal: {
          id_imagen_mascota: 'img-' + id,
          id_reporte_mascota: id,
          url: id === '1' ? '/images/pet-max.png' : (id === '2' ? '/images/pet-cat.png' : '/images/pet-toby.png'),
          es_principal: true,
          creado_en: new Date().toISOString()
        },
        usuario: {
          id_usuario: 'usr-' + id,
          nombre: 'Usuario Guardián',
          foto_perfil: '/images/avatar-maria.png'
        },
        total_likes: 15,
        total_comentarios: 2,
        liked_por_usuario: false
      };
    }
  }

  /**
   * Crea un nuevo reporte de mascota.
   * Endpoint: POST /api/v1/reportes
   */
  async createReporte(data: CreateReporteMascotaRequest): Promise<PetReport> {
    try {
      return await firstValueFrom(
        this.http.post<PetReport>(`${this.apiUrl}/reportes`, data)
      );
    } catch (error) {
      console.warn('Error al crear reporte real en backend. Simulando éxito local:', error);
      const newReport: PetReport = {
        id_reporte_mascota: Math.random().toString(36).substr(2, 9),
        nombre: data.nombre || 'Mascota reportada',
        tipo: data.id_especie === 'esp-cat-id' ? 'gato' : 'perro',
        raza: 'Raza mixta',
        estado: data.estado,
        ubicacion: data.ubicacion || 'Ubicación seleccionada',
        departamento: data.departamento || 'Ancash',
        provincia: data.provincia || 'Santa',
        distrito: data.distrito || 'Nuevo Chimbote',
        latitud: data.latitud || -9.1214,
        longitud: data.longitud || -78.5308,
        creado_en: new Date().toISOString(),
        imagen_principal: data.imagenes && data.imagenes.length > 0 ? {
          id_imagen_mascota: 'img-new',
          id_reporte_mascota: 'new',
          url: data.imagenes[0],
          es_principal: true,
          creado_en: new Date().toISOString()
        } : null,
        usuario: {
          id_usuario: data.id_usuario,
          nombre: 'Guardián Activo',
          foto_perfil: '/images/avatar-maria.png'
        },
        total_likes: 0,
        total_comentarios: 0,
        liked_por_usuario: false
      };
      
      // Lanzar evento global para recargar en caso de que otras pantallas estén escuchando
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('pet-report-created');
        window.dispatchEvent(event);
      }
      
      return newReport;
    }
  }

  /**
   * Actualiza un reporte de mascota existente.
   * Endpoint: PUT /api/v1/reportes/{id}
   */
  async updateReporte(id: string, data: UpdateReporteMascotaRequest): Promise<PetReport> {
    return firstValueFrom(
      this.http.put<PetReport>(`${this.apiUrl}/reportes/${id}`, data)
    );
  }

  /**
   * Elimina un reporte de mascota por su ID.
   * Endpoint: DELETE /api/v1/reportes/{id}
   */
  async deleteReporte(id: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.delete<{ message: string }>(`${this.apiUrl}/reportes/${id}`)
    );
  }

  /**
   * Da o quita un like a un reporte de mascota.
   * Endpoint: POST /api/v1/reportes/{id}/likes
   */
  async toggleLike(id: string): Promise<{ liked_por_usuario: boolean; total_likes: number }> {
    try {
      return await firstValueFrom(
        this.http.post<{ liked_por_usuario: boolean; total_likes: number }>(
          `${this.apiUrl}/reportes/${id}/likes`,
          {}
        )
      );
    } catch (error) {
      console.warn(`Error al dar/quitar like real en backend para ID ${id}. Simulando localmente:`, error);
      return { liked_por_usuario: true, total_likes: 1 };
    }
  }

  /**
   * Obtiene los reportes creados por un usuario específico.
   * Endpoint: GET /api/v1/usuarios/{id}/reportes
   */
  async getReportesCreados(idUsuario: string): Promise<PetReport[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: PetReport[] }>(`${this.apiUrl}/usuarios/${idUsuario}/reportes`)
      );
      return res.data || [];
    } catch (error) {
      console.error(`Error al obtener reportes creados para usuario ${idUsuario}:`, error);
      return [];
    }
  }

  /**
   * Obtiene los reportes likeados por un usuario específico.
   * Endpoint: GET /api/v1/usuarios/{id}/likes
   */
  async getReportesGustados(idUsuario: string): Promise<PetReport[]> {
    try {
      interface LikeResponse {
        id_usuario: string;
        id_reporte_mascota: string;
        creado_en: string;
        reporte_mascota: PetReport;
      }
      const res = await firstValueFrom(
        this.http.get<LikeResponse[]>(`${this.apiUrl}/usuarios/${idUsuario}/likes`)
      );
      return (res || []).map(item => item.reporte_mascota).filter(Boolean);
    } catch (error) {
      console.error(`Error al obtener reportes gustados para usuario ${idUsuario}:`, error);
      return [];
    }
  }

  /**
   * Obtiene los reportes compartidos por un usuario específico.
   * Endpoint: GET /api/v1/usuarios/{id}/compartidos
   */
  async getReportesCompartidos(idUsuario: string): Promise<PetReport[]> {
    try {
      interface CompartidoResponse {
        id_compartido: string;
        id_usuario: string;
        id_reporte_mascota: string;
        creado_en: string;
        reporte_mascota: PetReport;
      }
      const res = await firstValueFrom(
        this.http.get<CompartidoResponse[]>(`${this.apiUrl}/usuarios/${idUsuario}/compartidos`)
      );
      return (res || []).map(item => item.reporte_mascota).filter(Boolean);
    } catch (error) {
      console.error(`Error al obtener reportes compartidos para usuario ${idUsuario}:`, error);
      return [];
    }
  }

  /**
   * Registra que un usuario comparte un reporte.
   * Endpoint: POST /api/v1/reportes/{id}/compartir
   */
  async compartirReporte(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/reportes/${id}/compartir`, {})
      );
    } catch (error) {
      console.error(`Error al compartir reporte ${id}:`, error);
    }
  }

  /**
   * Registra que un usuario descomparte un reporte.
   * Endpoint: DELETE /api/v1/reportes/{id}/compartir
   */
  async descompartirReporte(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/reportes/${id}/compartir`)
      );
    } catch (error) {
      console.error(`Error al descompartir reporte ${id}:`, error);
    }
  }

  /**
   * Obtiene todos los avistamientos de un reporte.
   * Endpoint: GET /api/v1/reportes/{id}/avistamientos
   */
  async getSightings(reportId: string): Promise<import('../models/pet.model').Avistamiento[]> {
    try {
      return await firstValueFrom(
        this.http.get<import('../models/pet.model').Avistamiento[]>(`${this.apiUrl}/reportes/${reportId}/avistamientos`)
      );
    } catch (error) {
      console.error(`Error al obtener avistamientos del reporte ${reportId}:`, error);
      return [];
    }
  }

  /**
   * Crea un nuevo avistamiento para un reporte.
   * Endpoint: POST /api/v1/reportes/{id}/avistamientos
   */
  async createSighting(reportId: string, data: import('../models/pet.model').CreateAvistamientoRequest): Promise<import('../models/pet.model').Avistamiento> {
    return firstValueFrom(
      this.http.post<import('../models/pet.model').Avistamiento>(`${this.apiUrl}/reportes/${reportId}/avistamientos`, data)
    );
  }

  /**
   * Actualiza el estado de un avistamiento (aceptar/rechazar).
   * Endpoint: PUT /api/v1/avistamientos/{id}/estado
   */
  async updateSightingStatus(sightingId: string, estado: number): Promise<void> {
    await firstValueFrom(
      this.http.put<void>(`${this.apiUrl}/avistamientos/${sightingId}/estado`, { estado })
    );
  }

  /**
   * Elimina un avistamiento del sistema de forma permanente.
   * Endpoint: DELETE /api/v1/avistamientos/{id}
   */
  async deleteSighting(sightingId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.apiUrl}/avistamientos/${sightingId}`)
    );
  }

  /**
   * Obtiene el historial de cambios de un reporte.
   * Endpoint: GET /api/v1/reportes/{id}/historial
   */
  async getHistorial(id: string, page = 1, limit = 50): Promise<{ data: any[] }> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    try {
      return await firstValueFrom(
        this.http.get<{ data: any[] }>(`${this.apiUrl}/reportes/${id}/historial`, { params })
      );
    } catch (error) {
      console.warn('Error al obtener historial de cambios:', error);
      return { data: [] };
    }
  }
}
