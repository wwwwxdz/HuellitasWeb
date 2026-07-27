import { Component, ElementRef, QueryList, ViewChildren, model, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-code-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './code-input.html',
  styleUrl: './code-input.scss'
})
export class CodeInputComponent implements OnInit {
  // Enlace bidireccional estándar con signals
  codeValue = model<string>('');

  // Array interno de 6 celdas
  digits = Array(6).fill('');

  @ViewChildren('inputField') inputFields!: QueryList<ElementRef<HTMLInputElement>>;

  ngOnInit(): void {
    // Sincronizar el valor inicial si existe
    this.syncFromValue(this.codeValue());
  }

  // Actualizar el valor externo y emitir cambios
  private updateExternalValue(): void {
    const combined = this.digits.join('');
    this.codeValue.set(combined);
  }

  // Sincronizar hacia adentro si se recibe valor externo
  private syncFromValue(val: string): void {
    if (!val) {
      this.digits = Array(6).fill('');
      return;
    }
    const clean = val.trim().substring(0, 6);
    for (let i = 0; i < 6; i++) {
      this.digits[i] = clean[i] || '';
    }
  }

  onInput(index: number, event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const val = inputEl.value;

    if (val) {
      // Tomar solo el último caracter si se escribe rápido
      this.digits[index] = val.charAt(val.length - 1);
      this.updateExternalValue();

      // Mover foco al siguiente
      if (index < 5) {
        setTimeout(() => {
          this.inputFields.toArray()[index + 1].nativeElement.focus();
        }, 10);
      }
    } else {
      this.digits[index] = '';
      this.updateExternalValue();
    }
  }

  onKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      if (!this.digits[index] && index > 0) {
        // Si el actual está vacío, borrar el anterior y enfocarlo
        this.digits[index - 1] = '';
        this.updateExternalValue();
        this.inputFields.toArray()[index - 1].nativeElement.focus();
      } else {
        this.digits[index] = '';
        this.updateExternalValue();
      }
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const pastedText = clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pastedText)) return; // solo números

    const cleanCode = pastedText.substring(0, 6);
    this.syncFromValue(cleanCode);
    this.updateExternalValue();

    // Enfocar el último input ingresado o el final
    const focusIndex = Math.min(cleanCode.length - 1, 5);
    if (focusIndex >= 0) {
      setTimeout(() => {
        this.inputFields.toArray()[focusIndex].nativeElement.focus();
      }, 10);
    }
  }
}
