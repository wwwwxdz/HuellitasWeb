import { Component, input, output, ViewChild, ElementRef, AfterViewInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { Mensaje } from '../../../../../../core/models/chat.model';
import { ChatMessageItemComponent } from '../message-item/message-item.component';

@Component({
  selector: 'app-chat-messages',
  standalone: true,
  imports: [CommonModule, DatePipe, ChatMessageItemComponent],
  templateUrl: './message-list.component.html',
  styleUrl: './message-list.component.scss',
})
export class ChatMessagesComponent implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private resizeObserver?: ResizeObserver;
  private isAutoScrolling = false;

  // Modern Signal Inputs
  mensajes = input<Mensaje[]>([]);
  isLoading = input<boolean>(false);
  isLoadingMore = input<boolean>(false);
  hasMore = input<boolean>(false);
  myId = input<string>('');
  otherAvatar = input<string>('');

  // Modern Outputs
  loadMore = output<void>();
  previewReport = output<Mensaje>();

  @ViewChild('messagesArea') messagesArea!: ElementRef;

  showDateSeparator(index: number): boolean {
    const msgs = this.mensajes();
    if (index === 0) return true;
    const prev = new Date(msgs[index - 1].creado_en).toDateString();
    const curr = new Date(msgs[index].creado_en).toDateString();
    return prev !== curr;
  }

  isMine(msg: Mensaje): boolean {
    return msg.remitente.id_usuario === this.myId();
  }

  trackByMsg(_: number, m: Mensaje) {
    return m.id_mensaje;
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.messagesArea.nativeElement);
    }
  }

  private handleResize(): void {
    if (this.isAutoScrolling) return;

    // Si el usuario está cerca del fondo, mantenemos el scroll al final
    if (this.isNearBottom()) {
      this.scrollToBottom('auto');
    }
  }

  public isNearBottom(threshold = 150): boolean {
    const el = this.messagesArea.nativeElement;
    // La distancia al fondo es scrollHeight - scrollTop - clientHeight
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceToBottom < threshold;
  }

  public scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    const el = this.messagesArea.nativeElement;
    this.isAutoScrolling = true;
    
    // Usamos requestAnimationFrame para asegurar que el DOM se haya actualizado
    requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior
      });
      
      // Resetear flag después de que termine el scroll (aproximado)
      setTimeout(() => {
        this.isAutoScrolling = false;
      }, behavior === 'smooth' ? 300 : 50);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }
}
