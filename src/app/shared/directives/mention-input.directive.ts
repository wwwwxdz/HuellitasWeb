import {
  Directive, ElementRef, inject, input, output, OnDestroy, HostListener
} from '@angular/core';
import { MentionService } from '../../core/services/mention.service';
import { UsuarioMencion } from '../../core/models/user.model';
import { MentionUtils } from '../../core/utils/mention.utils';

/**
 * Directiva para agregar typeahead de menciones a cualquier input nativo.
 * Uso: <input mentionInput (mentionSelected)="onMention($event)">
 *      <textarea mentionInput (mentionSelected)="onMention($event)">
 */
@Directive({
  selector: '[mentionInput]',
  standalone: true,
})
export class MentionInputDirective implements OnDestroy {
  private el = inject(ElementRef<HTMLInputElement | HTMLTextAreaElement>);
  private mentionService = inject(MentionService);

  mentionSelected = output<UsuarioMencion>();

  private active = false;

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const el = this.el.nativeElement;
    const text = el.value;
    const cursorPos = el.selectionStart ?? text.length;

    const query = MentionUtils.detectMentionQuery(text, cursorPos);

    if (query !== null) {
      const rect = el.getBoundingClientRect();
      this.active = true;
      if (this.mentionService.isOpen) {
        this.mentionService.updateQuery(query, { rect });
      } else {
        this.mentionService.open(
          { rect },
          query,
          (user) => {
            this.active = false;
            this.insertMention(user);
            this.mentionSelected.emit(user);
          },
          () => { this.active = false; }
        );
      }
      return;
    }

    // Si no hay @, cerrar
    if (this.active) {
      this.mentionService.close();
      this.active = false;
    }
  }

  @HostListener('blur')
  onBlur() {
    // Pequeño delay para permitir que el click en el overlay se procese primero
    setTimeout(() => {
      if (this.active && !this.mentionService.isOpen) {
        this.active = false;
      }
    }, 200);
  }

  @HostListener('keydown.escape')
  onEscape() {
    if (this.active) {
      this.mentionService.close();
      this.active = false;
    }
  }

  private insertMention(user: UsuarioMencion) {
    const el = this.el.nativeElement;
    const text = el.value;
    const cursorPos = el.selectionStart ?? text.length;
    const { newText, newCursor } = MentionUtils.insertMentionIntoText(text, cursorPos, user.nombre);

    // Actualizar el valor del input nativo y disparar un evento 'input'
    // para que Angular/el model binding se entere
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      el instanceof HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeInputValueSetter?.call(el, newText);
    el.dispatchEvent(new Event('input', { bubbles: true }));

    // Mover cursor al final de la mención insertada
    requestAnimationFrame(() => {
      el.setSelectionRange(newCursor, newCursor);
      el.focus();
    });
  }

  ngOnDestroy() {
    if (this.active) {
      this.mentionService.close();
    }
  }
}
