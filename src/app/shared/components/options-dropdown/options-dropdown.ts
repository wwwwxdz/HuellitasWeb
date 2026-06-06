import { Component, input, output, signal, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownOption {
  label: string;
  icon?: string;
  value: string;
  danger?: boolean;
}

@Component({
  selector: 'app-options-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './options-dropdown.html',
  styleUrl: './options-dropdown.scss'
})
export class OptionsDropdownComponent {
  private readonly elementRef = inject(ElementRef);

  options = input.required<DropdownOption[]>();
  optionSelected = output<DropdownOption>();

  isOpen = signal<boolean>(false);

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isOpen.update(open => !open);
  }

  selectOption(option: DropdownOption, event: Event): void {
    event.stopPropagation();
    this.optionSelected.emit(option);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
