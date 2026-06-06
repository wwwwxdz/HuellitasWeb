import { Component, input, output, model, HostListener, ElementRef, inject, PLATFORM_ID, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalComponent implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  isOpen = model<boolean>(false);
  title = input<string>('');
  showFooter = input<boolean>(true);
  size = input<'sm' | 'md' | 'lg'>('md');
  allowOverflow = input<boolean>(false);

  closed = output<void>();

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.appendChild(this.el.nativeElement);
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      if (this.el.nativeElement.parentNode === document.body) {
        document.body.removeChild(this.el.nativeElement);
      }
    }
  }

  @HostListener('document:keydown.escape')
  onKeydownHandler() {
    if (this.isOpen()) {
      this.onClose();
    }
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onClose();
    }
  }

  onClose() {
    this.isOpen.set(false);
    this.closed.emit();
  }
}
