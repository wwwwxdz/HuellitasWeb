export interface PetImage {
  id_imagen_mascota: string;
  id_reporte_mascota: string;
  url: string;
  es_principal: boolean;
  creado_en: string;
}

export interface PetUser {
  id_usuario: string;
  nombre: string;
  foto_perfil: string;
}

export interface PetReport {
  id_reporte_mascota: string;
  nombre: string;
  tipo: string;
  raza: string;
  id_especie?: string;
  id_raza?: string;
  estado: number; // 1=encontrado, 2=perdido, 3=avistado, 4=reunido
  ubicacion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  latitud: number;
  longitud: number;
  creado_en: string;
  imagen_principal: PetImage | null;
  usuario: PetUser;
  total_likes: number;
  total_comentarios: number;
  liked_por_usuario: boolean;
  compartido_por_id?: string | null;
  compartido_por_nombre?: string | null;
  esta_compartido?: boolean;
  total_compartidos?: number;
  collar?: boolean;
  collar_color?: string;
  caracteristicas?: PetCaracteristicas;
  descripcion?: string;
  imagenes?: PetImage[];
  recompensa?: boolean;
  monto_recompensa?: number;
}

export interface PetCaracteristicas {
  color?: string;
  color_secundario?: string;
  tamano?: string;
  collar?: boolean;
  collar_color?: string;
  pelo?: string;
  caracteristicas_especiales?: string;
  recompensa?: boolean;
}

export interface ReporteMascotaPuntoMapa {
  id_reporte_mascota: string;
  nombre: string;
  estado: number;
  latitud: number;
  longitud: number;
  id_especie: string;
  foto_principal: string;
}

export interface Especie {
  id_especie: string;
  nombre: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface Raza {
  id_raza: string;
  id_especie: string;
  nombre: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface Color {
  id_color: string;
  nombre: string;
  hex: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface GetReportesFilters {
  search?: string;
  estado?: number;
  ubicacion?: string;
  tipo?: string;
  raza?: string;
  id_especie?: string;
  id_raza?: string;
  start_date?: string;
  end_date?: string;
  lat?: number;
  lng?: number;
  radio?: number;
  page?: number;
  limit?: number;
}

export interface CreateReporteMascotaRequest {
  id_usuario: string;
  id_especie: string;
  id_raza: string;
  estado: number;
  nombre?: string;
  caracteristicas: Record<string, any>;
  descripcion?: string;
  latitud?: number;
  longitud?: number;
  radio?: number;
  fecha_avistamiento?: string;
  hora_avistamiento?: string;
  ubicacion?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  imagenes?: string[];
  collar?: boolean;
  collar_color?: string;
  recompensa?: boolean;
  monto_recompensa?: number;
}

export interface UpdateReporteMascotaRequest {
  id_usuario?: string;
  id_especie?: string;
  id_raza?: string;
  nombre?: string;
  caracteristicas?: Record<string, any>;
  descripcion?: string;
  estado?: number;
  latitud?: number;
  longitud?: number;
  radio?: number;
  fecha_avistamiento?: string;
  hora_avistamiento?: string;
  esta_archivado?: boolean;
  ubicacion?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  imagenes?: string[];
  collar?: boolean;
  collar_color?: string;
  recompensa?: boolean;
  monto_recompensa?: number;
}
