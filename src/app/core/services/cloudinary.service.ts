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
   * Comprime y redimensiona una imagen en el navegador del cliente antes de subirla.
   * Redimensiona para que el lado más largo mida máximo 1200px y aplica compresión JPEG de 80%.
   */
  private compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        return resolve(file);
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Calcular la proporción proporcional manteniendo aspecto
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(file);
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  /**
   * Sube una imagen directamente a Cloudinary y devuelve la URL segura.
   * @param file El archivo binario de la imagen.
   * @param carpeta La subcarpeta dentro de Cloudinary.
   */
  async uploadImage(file: File, carpeta = 'perfiles'): Promise<string> {
    const formData = new FormData();
    
    // Comprimir imagen en el cliente de forma asíncrona
    let fileToUpload: Blob = file;
    try {
      fileToUpload = await this.compressImage(file, 1200, 1200, 0.85);
    } catch (err) {
      console.warn('No se pudo comprimir la imagen en el cliente, subiendo original:', err);
    }

    formData.append('file', fileToUpload, file.name);
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
