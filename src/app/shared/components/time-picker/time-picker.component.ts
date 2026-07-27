import { Component, HostListener, ElementRef, forwardRef, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-time-picker',
  standalone: true,
  imports: [],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimePickerComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './time-picker.component.html',
  styleUrl: './time-picker.component.scss',
})
export class TimePickerComponent implements ControlValueAccessor {
  private el = inject(ElementRef);

  isOpen = signal(false);
  selectedHour = signal('');
  selectedMinute = signal('');

  readonly hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  readonly minutes = ['00', '15', '30', '45'];

  onChange: (value: string) => void = () => { /* empty */ };
  onTouched: () => void = () => { /* empty */ };

  displayValue = computed(() => {
    const h = this.selectedHour();
    const m = this.selectedMinute();
    if (h && m) {
      return `${h}:${m}`;
    }
    return '';
  });

  toggle() {
    this.isOpen.update(v => !v);
    this.onTouched();
  }

  selectHour(h: string) {
    this.selectedHour.set(h);
    this.emit();
  }

  selectMinute(m: string) {
    this.selectedMinute.set(m);
    this.emit();
    if (this.selectedHour()) this.isOpen.set(false);
  }

  private emit() {
    const h = this.selectedHour();
    const m = this.selectedMinute();
    if (h && m) {
      this.onChange(`${h}:${m}`);
    }
  }

  writeValue(value: string): void {
    if (value && value.includes(':')) {
      let [hStr, mStr] = value.split(':');
      let hour = parseInt(hStr, 10);
      const min = parseInt(mStr, 10);

      let roundedMin = '00';
      if (min >= 8 && min < 23) {
        roundedMin = '15';
      } else if (min >= 23 && min < 38) {
        roundedMin = '30';
      } else if (min >= 38 && min < 53) {
        roundedMin = '45';
      } else if (min >= 53) {
        roundedMin = '00';
        hour = (hour + 1) % 24;
      }

      this.selectedHour.set(String(hour).padStart(2, '0'));
      this.selectedMinute.set(roundedMin);
    }
  }

  registerOnChange(fn: (value: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
