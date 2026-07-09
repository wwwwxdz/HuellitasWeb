import {
  Component,
  inject,
  ElementRef,
  HostListener,
  signal,
  computed,
  input,
  output,
  model,
  effect,
} from '@angular/core';

export interface DateRange {
  start: Date | null;
  end: Date | null;
  label: string;
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [],
  template: `
    <div
      class="datepicker-wrapper"
      style="font-family: var(--font-main), sans-serif; user-select: none;"
    >
      @if (label()) {
        <label class="datepicker-label" [for]="id()">{{ label() }}</label>
      }

      <div
        class="datepicker-container"
        [class.is-open]="isOpen()"
        style="position: relative; width: 100%;"
      >
        <!-- Trigger -->
        <div
          class="datepicker-trigger"
          [id]="id()"
          (click)="toggle()"
          (keydown.enter)="toggle()"
          tabindex="0"
          role="button"
        >
          <div class="trigger-content">
            <i class="material-icons trigger-icon">calendar_today</i>
            <span class="selected-text" [class.placeholder]="!selectedRange().start">
              {{ selectedRange().label || placeholder() }}
            </span>
          </div>
          <i class="material-icons arrow-icon">expand_more</i>
        </div>

        <!-- Dropdown Panel -->
        @if (isOpen()) {
          <div class="datepicker-panel" [class.single-mode]="mode() === 'single'">
            @if (mode() === 'range') {
              <div class="presets-column">
                <p class="panel-subtitle">Presets</p>
                @for (preset of presets; track preset.label) {
                  <button class="preset-btn" (click)="selectPreset(preset)">
                    {{ preset.label }}
                  </button>
                }
              </div>
            }

            <div class="calendar-column">
              <div class="calendar-header">
                <button class="nav-btn" (click)="prevMonth()">
                  <i class="material-icons">chevron_left</i>
                </button>
                <span class="month-year">{{ monthName() }} {{ year() }}</span>
                <button class="nav-btn" (click)="nextMonth()">
                  <i class="material-icons">chevron_right</i>
                </button>
              </div>

              <div class="calendar-weekdays">
                <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span
                ><span>Sa</span><span>Do</span>
              </div>

              <div class="calendar-grid">
                @for (day of days(); track $index) {
                  <div
                    class="calendar-day"
                    [class.empty]="day === 0"
                    [class.today]="isToday(day)"
                    [class.selected]="isSelected(day)"
                    [class.range-start]="isStartRange(day)"
                    [class.range-end]="isEndRange(day)"
                    [class.range-between]="isBetweenRange(day)"
                    (click)="selectDate(day)"
                    (keydown.enter)="selectDate(day)"
                    tabindex="0"
                    role="button"
                    [attr.aria-label]="day !== 0 ? 'Seleccionar día ' + day : null"
                  >
                    {{ day !== 0 ? day : '' }}
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .datepicker-wrapper {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
      }

      .datepicker-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-main);
      }

      .datepicker-trigger {
        width: 100%;
        padding: 13px 18px;
        background: var(--bg-input, rgba(255, 255, 255, 0.03));
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        color: var(--text-main);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

        &:hover {
          background: rgba(var(--primary-rgb, 60, 129, 138), 0.05);
          border-color: var(--primary-color);
        }

        .trigger-content {
          display: flex;
          align-items: center;
          gap: 12px;

          .trigger-icon {
            font-size: 1.25rem;
            color: var(--primary-color);
          }

          .selected-text {
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--text-main);

            &.placeholder {
              color: var(--text-muted);
              opacity: 0.6;
            }
          }
        }

        .arrow-icon {
          font-size: 1.35rem;
          color: var(--text-muted);
          transition: transform 0.3s ease;
        }
      }

      .datepicker-container.is-open {
        .datepicker-trigger {
          border-color: var(--primary-color);
          background: var(--bg-card, #18181b);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 60, 129, 138), 0.15);

          .arrow-icon {
            transform: rotate(180deg);
            color: var(--primary-color);
          }
        }
      }

      .datepicker-panel {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        display: flex;
        flex-direction: column;
        background: var(--bg-card, #18181b);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        border-radius: 20px;
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(var(--glass-blur, 12px));
        z-index: 2000;
        padding: 12px;
        gap: 12px;
        min-width: 280px;
        width: 100%;
        animation: panelIn 0.25s cubic-bezier(0, 0, 0.2, 1) forwards;

        @media (min-width: 768px) {
          flex-direction: row;
          width: auto;
        }
      }

      .presets-column {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 6px;
        border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        padding-bottom: 12px;

        @media (min-width: 768px) {
          width: 150px;
          flex-direction: column;
          flex-wrap: nowrap;
          gap: 4px;
          border-right: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
          border-bottom: none;
          padding-right: 12px;
          padding-bottom: 0;
        }

        .panel-subtitle {
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          padding: 4px 8px;
          margin: 0;
          width: 100%;
        }

        .preset-btn {
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
          color: var(--text-main);
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;

          @media (min-width: 768px) {
            width: 100%;
            padding: 8px 12px;
            text-align: left;
            background: transparent;
            border: none;
            border-radius: 10px;
          }

          &:hover {
            background: rgba(var(--primary-rgb, 60, 129, 138), 0.1);
            color: var(--primary-color);
          }
        }
      }

      .calendar-column {
        flex: 1;
        padding: 8px 6px;

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;

          .month-year {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text-main);
            text-transform: capitalize;
          }

          .nav-btn {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
            color: var(--text-muted);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;

            &:hover {
              background: var(--primary-color);
              color: white;
            }
          }
        }

        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          margin-bottom: 8px;

          span {
            text-align: center;
            font-size: 0.72rem;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
          }
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          row-gap: 4px;

          .calendar-day {
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-main);
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
            z-index: 1;

            &:hover:not(.empty):not(.selected):not(.range-between) {
              background: rgba(var(--primary-rgb, 60, 129, 138), 0.1);
              color: var(--primary-color);
            }

            &.today {
              color: var(--primary-color);
              text-decoration: underline;
              font-weight: 800;
            }

            &.selected {
              background: var(--primary-color) !important;
              color: white !important;
              border-radius: 50%;
            }

            &.range-between {
              background: rgba(var(--primary-rgb, 60, 129, 138), 0.15) !important;
              color: var(--primary-color) !important;
              border-radius: 0 !important;
            }

            &.range-start {
              background: var(--primary-color) !important;
              color: white !important;
              border-top-left-radius: 50% !important;
              border-bottom-left-radius: 50% !important;
              border-top-right-radius: 0 !important;
              border-bottom-right-radius: 0 !important;

              &::after {
                content: '';
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                width: 50%;
                background: rgba(var(--primary-rgb, 60, 129, 138), 0.15);
                z-index: -1;
              }
            }

            &.range-end {
              background: var(--primary-color) !important;
              color: white !important;
              border-top-right-radius: 50% !important;
              border-bottom-right-radius: 50% !important;
              border-top-left-radius: 0 !important;
              border-bottom-left-radius: 0 !important;

              &::after {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 50%;
                background: rgba(var(--primary-rgb, 60, 129, 138), 0.15);
                z-index: -1;
              }
            }

            &.range-start.range-end {
              border-radius: 50% !important;
              &::after {
                display: none !important;
              }
            }

            &.empty {
              cursor: default;
              background: transparent !important;
              &::after {
                display: none !important;
              }
            }
          }
        }
      }

      @keyframes panelIn {
        from {
          opacity: 0;
          transform: translateY(-8px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .datepicker-panel.single-mode {
        min-width: 280px;
        width: auto;

        .calendar-column {
          border-left: none;
        }
      }
    `,
  ],
})
export class DatePicker {
  id = input('');
  label = input('');
  placeholder = input('Seleccionar fecha...');
  mode = input<'range' | 'single'>('range');

  range = input<DateRange | null>(null);
  value = model<Date | null>(null);

  rangeChange = output<DateRange>();
  dateChange = output<Date>();

  isOpen = signal(false);
  selectedRange = signal<DateRange>({ start: null, end: null, label: '' });

  viewDate = signal(new Date());
  days = signal<number[]>([]);

  monthName = computed(() => this.viewDate().toLocaleString('es-ES', { month: 'long' }));
  year = computed(() => this.viewDate().getFullYear());

  presets = [
    { label: 'Hoy', days: 0 },
    { label: 'Ayer', days: 1 },
    { label: 'Últimos 7 días', days: 7 },
    { label: 'Últimos 30 días', days: 30 },
    { label: 'Este mes', days: -1 },
    { label: 'Todo el tiempo', days: -2 },
  ];

  private elementRef = inject(ElementRef);

  constructor() {
    effect(() => {
      const rng = this.range();
      if (rng && rng.start) {
        this.selectedRange.set({
          start: rng.start,
          end: rng.end,
          label: rng.label || `${this.formatDate(rng.start)} - ${this.formatDate(rng.end)}`,
        });
        this.viewDate.set(new Date(rng.start));
      }
    });

    effect(() => {
      const val = this.value();
      if (val) {
        const date = new Date(val);
        this.selectedRange.set({
          start: date,
          end: date,
          label: this.formatDate(date),
        });
        this.viewDate.set(new Date(date));
      }
    });

    effect(() => {
      this.renderCalendar();
    });
  }

  toggle() {
    this.isOpen.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  private renderCalendar() {
    const date = this.viewDate();
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const daysList: number[] = [];
    for (let i = 0; i < startDay; i++) daysList.push(0);
    for (let i = 1; i <= daysInMonth; i++) daysList.push(i);
    this.days.set(daysList);
  }

  prevMonth() {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  selectDate(day: number) {
    if (day === 0) return;

    const date = new Date(this.year(), this.viewDate().getMonth(), day);

    if (this.mode() === 'single') {
      const range = { start: date, end: date, label: this.formatDate(date) };
      this.selectedRange.set(range);
      this.value.set(date);
      this.dateChange.emit(date);
      this.rangeChange.emit(range);
      this.isOpen.set(false);
      return;
    }

    const current = this.selectedRange();
    if (!current.start || (current.start && current.end)) {
      this.selectedRange.set({ start: date, end: null, label: 'Seleccionando...' });
    } else {
      let start = current.start;
      let end = date;
      if (date < start) {
        end = start;
        start = date;
      }
      const range = { start, end, label: `${this.formatDate(start)} - ${this.formatDate(end)}` };
      this.selectedRange.set(range);
      this.rangeChange.emit(range);
      setTimeout(() => this.isOpen.set(false), 300);
    }
  }

  selectPreset(preset: { label: string; days: number }) {
    const end = new Date();
    let start = new Date();

    if (preset.days === -1) {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (preset.days === -2) {
      start = new Date(2020, 0, 1);
    } else {
      start.setDate(end.getDate() - preset.days);
    }

    const range = { start, end, label: preset.label };
    this.selectedRange.set(range);
    this.rangeChange.emit(range);
    this.isOpen.set(false);
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  isToday(day: number): boolean {
    const today = new Date();
    return (
      day === today.getDate() &&
      this.viewDate().getMonth() === today.getMonth() &&
      this.year() === today.getFullYear()
    );
  }

  isSelected(day: number): boolean {
    if (day === 0) return false;
    const current = this.selectedRange();
    if (!current.start) return false;

    const date = new Date(this.year(), this.viewDate().getMonth(), day);

    if (current.start && !current.end) {
      return date.getTime() === current.start.getTime();
    }

    return date >= current.start! && date <= current.end!;
  }

  isStartRange(day: number): boolean {
    if (day === 0) return false;
    const current = this.selectedRange();
    if (!current.start) return false;
    const date = new Date(this.year(), this.viewDate().getMonth(), day);

    return (
      date.getDate() === current.start.getDate() &&
      date.getMonth() === current.start.getMonth() &&
      date.getFullYear() === current.start.getFullYear()
    );
  }

  isEndRange(day: number): boolean {
    if (day === 0) return false;
    const current = this.selectedRange();
    if (!current.end) return false;
    const date = new Date(this.year(), this.viewDate().getMonth(), day);

    return (
      date.getDate() === current.end.getDate() &&
      date.getMonth() === current.end.getMonth() &&
      date.getFullYear() === current.end.getFullYear()
    );
  }

  isBetweenRange(day: number): boolean {
    if (day === 0) return false;
    const current = this.selectedRange();
    if (!current.start || !current.end) return false;

    const startNorm = new Date(
      current.start.getFullYear(),
      current.start.getMonth(),
      current.start.getDate(),
    );
    const endNorm = new Date(
      current.end.getFullYear(),
      current.end.getMonth(),
      current.end.getDate(),
    );
    if (startNorm.getTime() === endNorm.getTime()) return false;

    const date = new Date(this.year(), this.viewDate().getMonth(), day);
    const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    return dateNorm.getTime() > startNorm.getTime() && dateNorm.getTime() < endNorm.getTime();
  }
}
