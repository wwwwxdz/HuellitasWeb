import { Injectable, inject, ApplicationRef, createComponent, EnvironmentInjector, ComponentRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { UsuarioMencion } from '../models/user.model';
import { MentionOverlayComponent } from '../../shared/components/mention-overlay/mention-overlay.component';

export interface MentionAnchor {
  rect: DOMRect;
}

@Injectable({ providedIn: 'root' })
export class MentionService {
  private document = inject(DOCUMENT);
  private appRef = inject(ApplicationRef);
  private envInjector = inject(EnvironmentInjector);

  private overlayRef: ComponentRef<MentionOverlayComponent> | null = null;
  private selectionCallback: ((user: UsuarioMencion) => void) | null = null;
  private dismissCallback: (() => void) | null = null;
  private _clickOutsideListener: ((e: MouseEvent) => void) | null = null;
  /** Guardamos el rect actual para reposicionar cuando carguen los usuarios */
  private _currentRect: DOMRect | null = null;

  open(
    anchor: MentionAnchor,
    query: string,
    onSelect: (user: UsuarioMencion) => void,
    onDismiss?: () => void
  ) {
    this._currentRect = anchor.rect;

    // Si ya hay un overlay abierto, solo actualiza la query y reposiciona
    if (this.overlayRef) {
      this.overlayRef.instance.query.set(query);
      this.overlayRef.instance.show.set(true);
      this.selectionCallback = onSelect;
      this.dismissCallback = onDismiss ?? null;
      return;
    }

    const ref = createComponent(MentionOverlayComponent, {
      environmentInjector: this.envInjector,
    });

    this.overlayRef = ref;
    this.selectionCallback = onSelect;
    this.dismissCallback = onDismiss ?? null;

    // Aplicar posición CSS al HOST antes de montar (evita flash en esquina)
    this._applyPositionToHost(ref.location.nativeElement as HTMLElement, anchor.rect);

    // Montar en el body
    this.appRef.attachView(ref.hostView);
    this.document.body.appendChild(ref.location.nativeElement);

    ref.instance.query.set(query);
    ref.instance.show.set(true);

    // Cuando cambien los usuarios, reposicionar (por si el panel creció/apareció)
    ref.instance.onUsersChange = (count: number) => {
      if (count > 0 && this._currentRect) {
        this._applyPositionToHost(ref.location.nativeElement as HTMLElement, this._currentRect);
      }
    };

    // Suscribirse a selección
    ref.instance.mentionSelected.subscribe((user: UsuarioMencion) => {
      this.selectionCallback?.(user);
      this.close();
    });

    // Click outside para cerrar
    this._clickOutsideListener = (e: MouseEvent) => {
      const hostEl = ref.location.nativeElement as HTMLElement;
      if (!hostEl.contains(e.target as Node)) {
        this.dismissCallback?.();
        this.close();
      }
    };
    setTimeout(() => {
      this.document.addEventListener('mousedown', this._clickOutsideListener!);
    }, 50);
  }

  updateQuery(query: string, anchor?: MentionAnchor) {
    if (anchor) this._currentRect = anchor.rect;
    if (this.overlayRef) {
      this.overlayRef.instance.query.set(query);
      if (anchor) {
        this._applyPositionToHost(this.overlayRef.location.nativeElement as HTMLElement, anchor.rect);
      }
    }
  }

  close() {
    if (this._clickOutsideListener) {
      this.document.removeEventListener('mousedown', this._clickOutsideListener);
      this._clickOutsideListener = null;
    }
    if (this.overlayRef) {
      this.overlayRef.instance.show.set(false);
      const ref = this.overlayRef;
      this.overlayRef = null;
      this.selectionCallback = null;
      this.dismissCallback = null;
      this._currentRect = null;
      setTimeout(() => {
        this.appRef.detachView(ref.hostView);
        ref.destroy();
      }, 200);
    }
  }

  get isOpen(): boolean {
    return this.overlayRef !== null;
  }

  /**
   * Aplica la posición directamente al elemento :host del overlay.
   * Siempre se posiciona ENCIMA del input usando bottom = (vh - rect.top).
   */
  private _applyPositionToHost(hostEl: HTMLElement, rect: DOMRect) {
    const panelWidth = 280;
    const margin = 8;

    // Horizontal: alineado con el input, sin salirse de la pantalla
    let left = rect.left;
    if (left + panelWidth + margin > window.innerWidth) {
      left = window.innerWidth - panelWidth - margin;
    }
    left = Math.max(margin, left);

    // Vertical: siempre ENCIMA del input usando bottom
    // bottom = distancia desde el fondo del viewport hasta el borde superior del input
    const bottomFromViewport = window.innerHeight - rect.top + margin;

    hostEl.style.position = 'fixed';
    hostEl.style.left = `${left}px`;
    hostEl.style.bottom = `${bottomFromViewport}px`;
    hostEl.style.top = 'auto';
    hostEl.style.zIndex = '99999';
    hostEl.style.pointerEvents = 'none';
  }
}
