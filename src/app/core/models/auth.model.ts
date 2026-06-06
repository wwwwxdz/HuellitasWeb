import { User } from './user.model';

export interface UsuarioSession extends User {
  role?: Role;
  permisos?: Permiso[];
  restricciones?: Restriccion[];
  latitud?: number;
  longitud?: number;
  radio?: number;
}

export interface Role {
  id_role: string;
  nombre: string;
  slug: string;
  color?: string;
  descripcion?: string;
  permisos?: Permiso[];
  creado_en?: string;
}

export interface Permiso {
  vista: string;
  acciones: string[];
}

export interface Restriccion {
  tipo: 'comentario' | 'publicacion' | 'perfil' | 'chat';
  hasta: string;
  razon: string;
  id_registro?: string;
  creado_en?: string;
  activo?: boolean;
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioSession;
}

export interface RegisterCodeResponse {
  message: string;
  code?: string;
}

export interface RegisterResponse {
  message: string;
}

export interface ResetPasswordPayload {
  identifier: string;
  code: string;
  new_password: string;
}
