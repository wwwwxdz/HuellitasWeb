export interface Comentario {
  id_comentario?: string;
  contenido: string;
  esta_eliminado?: boolean;
  creado_en: string | Date;
  total_likes?: number;
  is_liked?: boolean;
  id_comentario_padre?: string | null;
  usuario: {
    id_usuario?: string;
    nombre: string;
    foto_perfil?: string;
  };
  respuestas?: Comentario[];
}

export interface CommentLikeResponse {
  total: number;
  liked: boolean;
}
