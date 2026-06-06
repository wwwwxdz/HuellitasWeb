import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface LocationSearchResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: number | string;
  address?: {
    state?: string;
    city?: string;
    town?: string;
    suburb?: string;
    road?: string;
    house_number?: string;
    postcode?: string;
    country?: string;
    county?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);

  /** Obtiene dirección legible a partir de coordenadas mediante Nominatim */
  async reverse(lat: number, lon: number): Promise<LocationSearchResult> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString())
      .set('format', 'json')
      .set('addressdetails', '1');

    return firstValueFrom(
      this.http.get<LocationSearchResult>('https://nominatim.openstreetmap.org/reverse', { params })
    );
  }
}
