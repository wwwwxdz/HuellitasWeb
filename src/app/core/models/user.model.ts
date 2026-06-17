export interface User {
  id_usuario: string;
  nombre: string;
  email: string;
  telefono?: string;
  foto_perfil?: string | null;
  bio?: string | null;
  id_role?: string;
  esta_baneado: boolean;
  is_verificado?: boolean;
  creado_en?: string;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
}



export interface UserGeoPreferences {
  lat: number;
  lng: number;
  radio_km: number;
}

export interface RawUserGeoResponse {
  ubicacion?: {
    type?: string;
    coordinates?: [number, number];
    lat?: number;
    lng?: number;
  } | null;
  radio?: number | null;
}

export interface UsuarioMencion {
  id_usuario: string;
  nombre: string;
  foto_perfil: string;
}
