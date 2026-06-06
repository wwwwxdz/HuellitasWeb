import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private readonly http = inject(HttpClient);

  // Parámetros de Cloudinary portados del Panel Administrativo para desarrollo
  private readonly cloudName = 'dzendch2p';
  private readonly uploadPreset = 'jhermypuerka';
  private readonly uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

  /**
   * Sube una imagen directamente a Cloudinary y devuelve la URL segura.
   * @param file El archivo binario de la imagen.
   * @param carpeta La subcarpeta dentro de Cloudinary.
   */
  async uploadImage(file: File, carpeta = 'perfiles'): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', `huellitas/${carpeta}`);

    try {
      const res = await firstValueFrom(
        this.http.post<{ secure_url: string }>(this.uploadUrl, formData)
      );
      return res.secure_url;
    } catch (error) {
      console.error('Error al subir imagen a Cloudinary:', error);
      throw new Error('No se pudo subir la imagen a la nube.');
    }
  }
}
