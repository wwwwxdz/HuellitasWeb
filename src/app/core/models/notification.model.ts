export type NotificationType = 'LIKE' | 'COMENTARIO' | 'RESPUESTA' | 'MATCH_IA' | 'MODERACION' | 'REPORTE_CERCANO' | 'MENCION' | 'MENSAJE';
export type EntityType = 'REPORTE' | 'COMENTARIO' | 'DENUNCIA' | 'USUARIO' | 'CHAT';

export interface Notification {
  id_notificacion: string;
  id_usuario: string;
  id_actor: string;
  tipo: NotificationType;
  mensaje: string;
  entidad_tipo: EntityType;
  id_entidad: string;
  leido: boolean;
  leido_en?: string;
  creado_en: string;
  
  // Opcionales para UI
  actor?: {
    nombre: string;
    foto_perfil: string;
  };
}

export interface NotificationResponse {
  data: Notification[];
  total: number;
}
