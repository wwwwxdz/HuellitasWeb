import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'mentionHighlight',
  standalone: true
})
export class MentionHighlightPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(value: string | undefined): SafeHtml {
    if (!value) return '';

    // Solo resaltamos menciones que tengan el delimitador invisible \u200B
    // Esto garantiza que la mención fue seleccionada del typeahead y no es solo texto aleatorio.
    const mentionRegex = /@([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_.\s]+?)\u200B/g;

    const formatted = value.replace(mentionRegex, (match, nombre) => {
      return `<span class="mention-text">@${nombre}</span>`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
}
