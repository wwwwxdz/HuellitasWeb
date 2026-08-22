import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';

export interface FacebookPostData {
  nombre?: string;
  estado: number; // 2: Se Perdió, 1: La Encontré, 3: La Avisté
  descripcion?: string;
  ubicacion?: string;
  imagenUrl?: string; // Para compatibilidad
  imagenesUrls?: string[]; // Lista completa de imágenes (hasta 4)
  reportId?: string | number;
}

export interface FacebookPublishResponse {
  id: string;
  post_id?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FacebookService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);

  private readonly GRAPH_API_VERSION = 'v20.0';
  private readonly BASE_GRAPH_URL = `https://graph.facebook.com/${this.GRAPH_API_VERSION}`;

  /**
   * Publica un reporte de mascota en la página de Facebook de la organización.
   * Si incluye varias imágenes, las sube sin publicar primero (published: false)
   * y luego las vincula en una única publicación (feed con attached_media).
   */
  async publicarReporte(datos: FacebookPostData): Promise<FacebookPublishResponse | null> {
    const pageAccessToken = this.configService.fbToken();
    const pageId = this.configService.fbPageId();

    if (!pageAccessToken || !pageId) {
      console.warn('[FACEBOOK SERVICE] Token de Facebook o Page ID no configurados.');
      return null;
    }

    const mensaje = this.construirMensaje(datos);
    const listaImagenes =
      datos.imagenesUrls && datos.imagenesUrls.length > 0
        ? datos.imagenesUrls
        : datos.imagenUrl
          ? [datos.imagenUrl]
          : [];

    try {
      if (listaImagenes.length === 0) {
        return await this.publicarSoloTexto(pageId, pageAccessToken, mensaje);
      } else if (listaImagenes.length === 1) {
        return await this.publicarConFotoUnica(pageId, pageAccessToken, mensaje, listaImagenes[0]);
      } else {
        return await this.publicarConMultiplesFotos(
          pageId,
          pageAccessToken,
          mensaje,
          listaImagenes,
        );
      }
    } catch (error) {
      console.error('[FACEBOOK SERVICE] Error al publicar en la página de Facebook:', error);
      // No arrojamos la excepción para evitar interrumpir la experiencia principal del usuario
      return null;
    }
  }

  /**
   * Publica un post con una sola foto.
   */
  private async publicarConFotoUnica(
    pageId: string,
    accessToken: string,
    caption: string,
    urlFoto: string,
  ): Promise<FacebookPublishResponse> {
    const endpoint = `${this.BASE_GRAPH_URL}/${pageId}/photos`;
    const payload = {
      url: urlFoto,
      caption: caption,
      published: true,
      privacy: JSON.stringify({ value: 'EVERYONE' }),
      access_token: accessToken,
    };

    console.info(`[FACEBOOK SERVICE] Publicando 1 foto en Facebook Page (${pageId})...`);
    return await firstValueFrom(this.http.post<FacebookPublishResponse>(endpoint, payload));
  }

  /**
   * Publica un post con múltiples fotos en un solo álbum/publicación.
   * 1. Subir cada imagen a /{pageId}/photos con published: false para obtener media_fbid.
   * 2. Crear el post en /{pageId}/feed con attached_media.
   */
  private async publicarConMultiplesFotos(
    pageId: string,
    accessToken: string,
    message: string,
    urlsFotos: string[],
  ): Promise<FacebookPublishResponse> {
    console.info(
      `[FACEBOOK SERVICE] Subiendo ${urlsFotos.length} fotos desvinculadas a Facebook...`,
    );

    // 1. Subir cada foto de forma oculta (published: false)
    const mediaFbids: string[] = [];
    for (const url of urlsFotos) {
      const endpointPhoto = `${this.BASE_GRAPH_URL}/${pageId}/photos`;
      const payloadPhoto = {
        url: url,
        published: false,
        access_token: accessToken,
      };
      const res = await firstValueFrom(this.http.post<{ id: string }>(endpointPhoto, payloadPhoto));
      if (res && res.id) {
        mediaFbids.push(res.id);
      }
    }

    // 2. Crear el post unificado en el feed con todas las imágenes adjuntas
    const endpointFeed = `${this.BASE_GRAPH_URL}/${pageId}/feed`;
    const attachedMedia = mediaFbids.map((id) => ({ media_fbid: id }));

    const payloadFeed = {
      message: message,
      attached_media: JSON.stringify(attachedMedia),
      published: true,
      privacy: JSON.stringify({ value: 'EVERYONE' }),
      access_token: accessToken,
    };

    console.info(
      `[FACEBOOK SERVICE] Publicando post con ${mediaFbids.length} fotos en el feed de Facebook Page (${pageId})...`,
    );
    return await firstValueFrom(this.http.post<FacebookPublishResponse>(endpointFeed, payloadFeed));
  }

  /**
   * Publica un post solo con texto/enlace en el muro de la página de FB.
   */
  private async publicarSoloTexto(
    pageId: string,
    accessToken: string,
    message: string,
  ): Promise<FacebookPublishResponse> {
    const endpoint = `${this.BASE_GRAPH_URL}/${pageId}/feed`;
    const payload = {
      message: message,
      published: true,
      privacy: JSON.stringify({ value: 'EVERYONE' }),
      access_token: accessToken,
    };

    console.info(`[FACEBOOK SERVICE] Publicando mensaje en Facebook Page (${pageId})...`);
    return await firstValueFrom(this.http.post<FacebookPublishResponse>(endpoint, payload));
  }

  /**
   * Formatea la plantilla del mensaje para Facebook.
   */
  private construirMensaje(datos: FacebookPostData): string {
    let titulo = '🚨 MASCOTA REPORTADA EN HUELLITAS';
    if (datos.estado === 2) {
      titulo = '🚨 ¡SE BUSCA! MASCOTA PERDIDA 🐾';
    } else if (datos.estado === 1) {
      titulo = '🎉 ¡MASCOTA ENCONTRADA! 🐾';
    } else if (datos.estado === 3) {
      titulo = '👁️ ¡MASCOTA AVISTADA! 🐾';
    }

    const partes: string[] = [titulo, ''];

    if (datos.nombre) {
      partes.push(`📌 Nombre: ${datos.nombre}`);
    }
    if (datos.ubicacion) {
      partes.push(`📍 Ubicación: ${datos.ubicacion}`);
    }
    if (datos.descripcion) {
      partes.push(`📝 Detalle: ${datos.descripcion}`);
    }

    partes.push('');
    if (datos.reportId) {
      partes.push(
        `🌐 Ver reporte completo en la web: https://huellitas.pe/pets/detail/${datos.reportId}`,
      );
    }
    partes.push('💬 Si tienes información o reconoces a la mascota, ingresa a nuestra plataforma.');
    partes.push('🔁 ¡Comparte esta publicación para ayudar!');

    return partes.join('\n');
  }
}
