import {
  Component,
  input,
  output,
  signal,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'app-image-viewer',
  standalone: true,
  imports: [],
  templateUrl: './image-viewer.component.html',
  styleUrl: './image-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageViewerComponent {
  src = input.required<string>();
  close = output<void>();

  // State
  scale = signal(1);
  translateX = signal(0);
  translateY = signal(0);
  isDragging = signal(false);

  // Internals for dragging
  private startX = 0;
  private startY = 0;

  zoomIn() {
    this.scale.update((s) => Math.min(s + 0.25, 6));
  }

  zoomOut() {
    this.scale.update((s) => Math.max(s - 0.25, 0.5));
  }

  resetZoom() {
    this.scale.set(1);
    this.translateX.set(0);
    this.translateY.set(0);
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  onOverlayClick(event: MouseEvent) {
    // Only close if clicking the actual overlay (not the controls or image)
    if ((event.target as HTMLElement).classList.contains('viewport')) {
      this.close.emit();
    }
  }

  startDrag(event: MouseEvent) {
    this.isDragging.set(true);
    this.startX = event.clientX - this.translateX();
    this.startY = event.clientY - this.translateY();
    event.preventDefault();
  }

  onDrag(event: MouseEvent) {
    if (!this.isDragging()) return;
    this.translateX.set(event.clientX - this.startX);
    this.translateY.set(event.clientY - this.startY);
  }

  endDrag() {
    this.isDragging.set(false);
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    this.close.emit();
  }
}
