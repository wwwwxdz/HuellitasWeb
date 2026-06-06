import { Pipe, PipeTransform } from '@angular/core';
import { SelectOption } from '../components/select/select';

@Pipe({
  name: 'appSelectOptions',
  standalone: true
})
export class SelectOptionsPipe implements PipeTransform {
  private capitalize(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  transform(value: any[] | null | undefined): SelectOption[] {
    if (!value || !Array.isArray(value)) return [];
    
    return value.map((item) => {
      // Si ya tiene el formato SelectOption
      if ('value' in item && 'label' in item) {
        return { ...item, label: this.capitalize(item.label) } as SelectOption;
      }
      // Especies (id_especie, nombre)
      if ('id_especie' in item && 'nombre' in item) {
        return { value: item.id_especie, label: this.capitalize(item.nombre) };
      }
      // Razas (id_raza, nombre)
      if ('id_raza' in item && 'nombre' in item) {
        return { value: item.id_raza, label: this.capitalize(item.nombre) };
      }
      // Genérico
      return { value: String(item.id || item.value || ''), label: this.capitalize(String(item.nombre || item.label || '')) };
    });
  }
}
