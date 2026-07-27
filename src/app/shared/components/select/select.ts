import { Component, input, model, HostListener, ElementRef, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
  hex?: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div 
      class="select-container"
      [class.active-dropdown]="isOpen()"
      [attr.id]="id()"
    >
      <!-- Botón principal del selector -->
      <div
        (click)="toggleOpen()"
        class="select-button"
        [class.open]="isOpen()"
        [class.disabled]="disabled()"
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
          class="material-icons dropdown-arrow"
          [class.open]="isOpen()"
        >
          expand_more
        </i>
      </div>

      <!-- Lista de opciones desplegable personalizada -->
      @if (isOpen() && !disabled()) {
        <div class="select-dropdown-wrapper">
          @if (searchable()) {
            <div class="select-search-box">
              <i class="material-icons search-icon">search</i>
              <input
                type="text"
                class="select-search-input"
                [placeholder]="searchPlaceholder()"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                (click)="$event.stopPropagation()"
              />
              @if (searchQuery()) {
                <i class="material-icons clear-icon" (click)="searchQuery.set(''); $event.stopPropagation()">close</i>
              }
            </div>
          }
          <ul class="select-dropdown" [class.has-search]="searchable()">
            @if (placeholder() && !searchQuery()) {
              <li
                (click)="handleSelect('')"
                class="select-option placeholder-option"
              >
                {{ placeholder() }}
              </li>
            }
            @for (opt of filteredOptions(); track opt.value) {
              <li
                (click)="handleSelect(opt.value)"
                class="select-option"
                [class.selected]="opt.value === value()"
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
            } @empty {
              <li class="select-option no-results">
                No se encontraron resultados
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .select-container {
      position: relative;
      width: 100%;
      font-family: var(--font-main), sans-serif;
      user-select: none;
      z-index: 10; /* z-index base */

      &.active-dropdown {
        z-index: 2000 !important; /* Eleva el select abierto sobre sus hermanos */
      }
    }

    .select-button {
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
      border: 1px solid var(--border-color);
      cursor: pointer;

      &.open {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(60, 129, 138, 0.15);
      }

      &.disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
    }

    .dropdown-arrow {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      transition: transform 0.2s ease;
      color: var(--text-muted);
      pointer-events: none;

      &.open {
        transform: translateY(-50%) rotate(180deg);
      }
    }

    .select-dropdown-wrapper {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 100%;
      background-color: var(--bg-card, #18181b) !important;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.45);
      z-index: 99999 !important;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .select-search-box {
      position: relative;
      display: flex;
      align-items: center;
      padding: 6px 10px 8px 10px;
      border-bottom: 1px solid var(--border-color);

      .search-icon {
        position: absolute;
        left: 14px;
        font-size: 1.1rem;
        color: var(--text-muted);
        pointer-events: none;
      }

      .clear-icon {
        position: absolute;
        right: 14px;
        font-size: 1rem;
        color: var(--text-muted);
        cursor: pointer;
        &:hover {
          color: var(--text-main);
        }
      }

      .select-search-input {
        width: 100%;
        padding: 8px 30px 8px 30px;
        border-radius: 0;
        border: none;
        background: transparent;
        color: var(--text-main);
        font-size: 0.88rem;
        outline: none;

        &:focus {
          border-color: transparent;
          box-shadow: none;
        }
      }
    }

    .select-dropdown {
      margin: 0;
      padding: 0;
      list-style: none;
      max-height: 220px;
      overflow-y: auto;
    }

    .select-option {
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text-main);
      background-color: var(--bg-card, #18181b) !important;

      &.selected {
        color: var(--primary-color);
        background-color: var(--bg-dark, #09090b) !important;
        font-weight: 600;
      }

      &.placeholder-option {
        color: var(--text-muted);
      }

      &.no-results {
        color: var(--text-muted);
        font-size: 0.85rem;
        cursor: default;
        justify-content: center;
        &:hover {
          background-color: transparent !important;
          color: var(--text-muted) !important;
        }
      }

      &:hover:not(.no-results) {
        background-color: var(--bg-dark, #09090b) !important;
        color: var(--primary-color) !important;
      }
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
  searchable = input<boolean>(false);
  searchPlaceholder = input<string>('Buscar...');

  isOpen = signal<boolean>(false);
  searchQuery = signal<string>('');

  filteredOptions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.options();
    return this.options().filter(opt => opt.label.toLowerCase().includes(query));
  });

  get selectedOption(): SelectOption | undefined {
    return this.options().find((opt) => opt.value === this.value());
  }

  get displayLabel(): string {
    return this.selectedOption ? this.selectedOption.label : (this.placeholder() || 'Seleccionar...');
  }

  toggleOpen(): void {
    if (!this.disabled()) {
      const nextState = !this.isOpen();
      this.isOpen.set(nextState);
      if (!nextState) {
        this.searchQuery.set('');
      }
    }
  }

  handleSelect(val: string): void {
    if (this.disabled()) return;
    this.value.set(val);
    this.isOpen.set(false);
    this.searchQuery.set('');
  }

  // Cerrar el dropdown al hacer click afuera
  @HostListener('document:mousedown', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      if (this.isOpen()) {
        this.isOpen.set(false);
        this.searchQuery.set('');
      }
    }
  }
}
