export type MotivoDenuncia = 'spam' | 'contenido_inapropiado' | 'informacion_falsa' | 'acoso' | 'otro';
export type TipoObjetivo = 'reporte' | 'comentario' | 'perfil' | 'chat';

export interface DenunciaPayload {
  tipo_objetivo: TipoObjetivo;
  id_objetivo: string;
  motivo: MotivoDenuncia;
  descripcion?: string;
}

export interface Denuncia {
  id_denuncia: string;
  id_denunciante: string;
  tipo_objetivo: TipoObjetivo;
  id_objetivo: string;
  motivo: MotivoDenuncia;
  descripcion: string;
  estado: 'pendiente' | 'castigada' | 'revisada' | 'descartada';
  creado_en: string;
  revisado_en?: string;
}
