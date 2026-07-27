/**
 * Formatea una fecha o cadena de fecha en una cadena de tiempo relativo en español.
 * 
 * Ejemplos:
 * - "hace un momento"
 * - "hace 5 min"
 * - "hace 2 hr"
 * - "hace 3 días"
 * - "hace 1 sem"
 * - "hace 2 meses"
 * - "hace 1 año"
 * 
 * @param value Fecha a formatear
 * @returns Cadena de tiempo relativo
 */
export function formatTimeAgo(value: string | Date | undefined | null): string {
  if (!value) return 'hace un momento';
  const fecha = typeof value === 'string' ? new Date(value) : value;
  
  // Fecha inválida o fecha cero de Go (0001-01-01)
  if (isNaN(fecha.getTime()) || fecha.getFullYear() < 2000) {
    return 'hace un momento';
  }
  
  const diffSeconds = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (diffSeconds < 0) return 'hace un momento';

  if (diffSeconds < 60)       return 'hace un momento';
  if (diffSeconds < 3600)     return `hace ${Math.floor(diffSeconds / 60)} min`;
  if (diffSeconds < 86400)    return `hace ${Math.floor(diffSeconds / 3600)} hr`;
  if (diffSeconds < 604800)   return `hace ${Math.floor(diffSeconds / 86400)} días`;
  if (diffSeconds < 2592000)  return `hace ${Math.floor(diffSeconds / 604800)} sem`;
  if (diffSeconds < 31536000) {
    const months = Math.floor(diffSeconds / 2592000);
    return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  
  const years = Math.floor(diffSeconds / 31536000);
  return `hace ${years} año${years !== 1 ? 's' : ''}`;
}
