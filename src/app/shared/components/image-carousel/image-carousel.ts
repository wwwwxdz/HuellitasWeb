import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-carousel.html',
  styleUrl: './image-carousel.scss'
})
export class ImageCarouselComponent {
  images = input.required<string[]>();
  alt = input('');
  
  imageClick = output<string>();
  
  currentIndex = signal(0);

  // Drag state
  private isDragging = false;
  private startX = 0;
  private scrollLeft = 0;
  private dragStartX = 0;
  private dragStartY = 0;

  onScroll(event: Event) {
    const element = event.target as HTMLElement;
    if (this.isDragging) return;
    
    const index = Math.round(element.scrollLeft / element.clientWidth);
    if (this.currentIndex() !== index) {
      this.currentIndex.set(index);
    }
  }

  onMouseDown(e: MouseEvent, container: HTMLElement) {
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    if (this.images().length <= 1) return;
    this.isDragging = true;
    container.classList.add('dragging');
    this.startX = e.pageX - container.offsetLeft;
    this.scrollLeft = container.scrollLeft;
  }


  onMouseMove(e: MouseEvent, container: HTMLElement) {
    if (!this.isDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - this.startX) * 1.5; // Multiplicador de sensibilidad
    container.scrollLeft = this.scrollLeft - walk;
  }

  onMouseUp(container: HTMLElement) {
    if (!this.isDragging) return;
    this.isDragging = false;
    container.classList.remove('dragging');
    
    const index = Math.round(container.scrollLeft / container.clientWidth);
    this.currentIndex.set(index);
    this.scrollTo(index, container);
  }

  scrollTo(index: number, element: HTMLElement) {
    element.scrollTo({
      left: index * element.clientWidth,
      behavior: 'smooth'
    });
  }

  onImageClick(e: MouseEvent, image: string) {
    if (this.images().length > 1) {
      const diffX = Math.abs(e.clientX - this.dragStartX);
      const diffY = Math.abs(e.clientY - this.dragStartY);
      if (diffX > 8 || diffY > 8) {
        return; // Fue un drag
      }
    }
    this.imageClick.emit(image);
  }
}

