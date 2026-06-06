import { Component, input, model, HostListener, ElementRef, inject, signal } from '@angular/core';

export interface SelectOption {
  value: string;
  label: string;
  hex?: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  template: `
    <div 
      class="select-container"
      [attr.id]="id()"
      style="position: relative; width: 100%; font-family: var(--font-main), sans-serif; user-select: none;"
    >
      <!-- Botón principal del selector -->
      <div
        (click)="toggleOpen()"
        [style.border]="isOpen() ? '1px solid var(--primary-color)' : '1px solid var(--border-color)'"
        [style.cursor]="disabled() ? 'not-allowed' : 'pointer'"
        [style.opacity]="disabled() ? 0.6 : 1"
        [style.boxShadow]="isOpen() ? '0 0 0 3px rgba(37, 99, 235, 0.1)' : 'none'"
        style="
          width: 100%;
          padding: 12px 40px 12px 16px;
          border-radius: 16px;
          background-color: var(--bg-card);
          color: var(--text-main);
          font-size: 0.9rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s ease;
        "
      >
        <div style="display: flex; align-items: center; gap: 8px;">
          @if (selectedOption?.hex) {
            <span 
              [style.backgroundColor]="selectedOption?.hex" 
              style="width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid rgba(255, 255, 255, 0.2); display: inline-block; box-shadow: var(--shadow-sm);"
            ></span>
          }
          <span>{{ displayLabel }}</span>
        </div>
        <i
          class="material-icons"
          [style.transform]="'translateY(-50%) ' + (isOpen() ? 'rotate(180deg)' : '')"
          style="
            position: absolute;
            right: 16px;
            top: 50%;
            transition: transform 0.2s ease;
            color: var(--text-muted);
            pointer-events: none;
          "
        >
          expand_more
        </i>
      </div>

      <!-- Lista de opciones desplegable personalizada -->
      @if (isOpen() && !disabled()) {
        <ul
          style="
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            width: 100%;
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            padding: 6px;
            margin: 0;
            list-style: none;
            max-height: 260px;
            overflow-y: auto;
          "
        >
          @if (placeholder()) {
            <li
              (click)="handleSelect('')"
              class="select-option placeholder-option"
              style="
                padding: 10px 14px;
                border-radius: 10px;
                font-size: 0.9rem;
                color: var(--text-muted);
                cursor: pointer;
                transition: all 0.15s ease;
              "
            >
              {{ placeholder() }}
            </li>
          }
          @for (opt of options(); track opt.value) {
            <li
              (click)="handleSelect(opt.value)"
              class="select-option"
              [style.color]="opt.value === value() ? 'var(--primary-color)' : 'var(--text-main)'"
              [style.backgroundColor]="opt.value === value() ? 'var(--bg-dark)' : 'transparent'"
              [style.fontWeight]="opt.value === value() ? 600 : 400"
              style="
                padding: 10px 14px;
                border-radius: 10px;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.15s ease;
                display: flex;
                align-items: center;
                justify-content: space-between;
              "
            >
              <div style="display: flex; align-items: center; gap: 8px;">
                @if (opt.hex) {
                  <span 
                    [style.backgroundColor]="opt.hex" 
                    style="width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid rgba(255, 255, 255, 0.2); display: inline-block; box-shadow: var(--shadow-sm);"
                  ></span>
                }
                <span>{{ opt.label }}</span>
              </div>
              @if (opt.value === value()) {
                <i class="material-icons" style="font-size: 1.1rem; color: var(--primary-color);">
                  check
                </i>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .select-option:hover {
      background-color: var(--bg-dark) !important;
      color: var(--primary-color) !important;
    }
  `]
})
export class Select {
  private readonly elRef = inject(ElementRef);

  options = input<SelectOption[]>([]);
  value = model<string>('');
  placeholder = input<string>('');
  disabled = input<boolean>(false);
  id = input<string>('');

  isOpen = signal<boolean>(false);

  get selectedOption(): SelectOption | undefined {
    return this.options().find((opt) => opt.value === this.value());
  }

  get displayLabel(): string {
    return this.selectedOption ? this.selectedOption.label : (this.placeholder() || 'Seleccionar...');
  }

  toggleOpen(): void {
    if (!this.disabled()) {
      this.isOpen.update((open) => !open);
    }
  }

  handleSelect(val: string): void {
    if (this.disabled()) return;
    this.value.set(val);
    this.isOpen.set(false);
  }

  // Cerrar el dropdown al hacer click afuera
  @HostListener('document:mousedown', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
