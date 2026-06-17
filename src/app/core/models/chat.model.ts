export interface ChatUsuario {
  id_usuario: string;
  nombre: string;
  foto_perfil: string;
  activo?: boolean;
}

export interface UltimoMensaje {
  contenido: string;
  creado_en: string;
  leido: boolean;
  id_remitente?: string;
}

export interface Chat {
  id_chat: string;
  creado_en: string;
  usuario_uno: ChatUsuario;
  usuario_dos: ChatUsuario;
  ultimo_mensaje: UltimoMensaje | null;
  mensajes_sin_leer: number;
}

export interface ReporteEmbebido {
  id_reporte_mascota: string;
  contenido?: string;
  nombre: string;
  estado: number | string;
  ubicacion: string;
  descripcion?: string;
  imagen_principal?: { url: string; es_principal?: boolean };
  usuario?: ChatUsuario;
  total_comentarios?: number;
  total_likes?: number;
  liked_por_usuario?: boolean;
}

export interface Mensaje {
  id_mensaje: string;
  id_chat: string;
  tipo?: 'texto' | 'reporte';
  contenido: string;
  id_reporte_mascota?: string;
  reporte_mascota?: ReporteEmbebido;
  leido: boolean;
  creado_en: string;
  remitente: ChatUsuario;
}

export interface MensajesResponse {
  data: Mensaje[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ChatsResponse {
  data: Chat[];
  total: number;
}

// Eventos WebSocket
export interface WsEventMensaje {
  tipo: 'mensaje';
  id_chat: string;
  payload: Mensaje;
}

export interface WsEventLeido {
  tipo: 'leido';
  id_chat: string;
}

export interface WsEventPong {
  tipo: 'pong';
}

export type WsEvent = WsEventMensaje | WsEventLeido | WsEventPong;
