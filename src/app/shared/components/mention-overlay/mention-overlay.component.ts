import {
  Component, inject, signal, output, HostListener, DestroyRef, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UsuarioMencion } from '../../../core/models/user.model';
import { Subject, finalize, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-mention-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (show() && users().length > 0) {
      <div class="mention-overlay-panel" (mousedown)="$event.preventDefault()">
        @for (user of users(); track user.id_usuario; let i = $index) {
          <div
            class="suggestion-item"
            [class.active]="i === activeIndex()"
            (mouseenter)="activeIndex.set(i)"
            (mousedown)="$event.preventDefault(); selectUser(user)"
          >
            <img [src]="user.foto_perfil || 'assets/images/default-avatar.png'" alt="">
            <span class="user-name">{{ user.nombre }}</span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .mention-overlay-panel {
      width: 280px;
      max-height: 240px;
      background: #18181b;
      border: 1px solid var(--border-color, #27272a);
      border-radius: 12px;
      box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0,0,0,0.4);
      overflow-y: auto;
      padding: 4px;
      pointer-events: all;
      animation: fadeIn 0.15s ease-out;

      scrollbar-width: thin;
      scrollbar-color: var(--border-color, #27272a) transparent;

      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-track { background: transparent; }
      &::-webkit-scrollbar-thumb {
        background: var(--border-color, #27272a);
        border-radius: 4px;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 8px;
      transition: background 0.15s;
      color: var(--text-main, #f4f4f5);
      user-select: none;

      img {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid var(--border-color, #27272a);
        flex-shrink: 0;
      }

      .user-name {
        font-size: 0.9rem;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &:hover, &.active {
        background: rgba(6, 182, 212, 0.12);
        color: var(--primary-color, #06b6d4);
      }
    }
  `]
})
export class MentionOverlayComponent {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  query = signal<string>('');
  show = signal<boolean>(false);
  mentionSelected = output<UsuarioMencion>();

  users = signal<UsuarioMencion[]>([]);
  isLoading = signal(false);
  activeIndex = signal(0);

  /** Callback que el MentionService inyecta para saber cuándo reposicionar */
  onUsersChange: ((count: number) => void) | null = null;

  private searchSubject = new Subject<string>();

  constructor() {
    // Pipeline principal de búsqueda con debounce
    this.searchSubject.pipe(
      debounceTime(180),
      distinctUntilChanged(),
      switchMap(q => {
        this.isLoading.set(true);
        return this.userService.searchMentions(q).pipe(
          finalize(() => this.isLoading.set(false))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(users => {
      const myId = this.authService.usuario()?.id_usuario;
      const filtered = users.filter(u => u.id_usuario !== myId);
      this.users.set(filtered);
      this.activeIndex.set(0);
      // Notificar al servicio para reposicionar si cambió el número de usuarios
      this.onUsersChange?.(filtered.length);
    });

    // Reaccionar a cambios de query y show usando effect
    effect(() => {
      const q = this.query();
      const isActive = this.show();
      if (isActive) {
        this.searchSubject.next(q);
      } else {
        this.users.set([]);
      }
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (!this.show() || this.users().length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update(i => (i + 1) % this.users().length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update(i => (i - 1 + this.users().length) % this.users().length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.selectUser(this.users()[this.activeIndex()]);
    } else if (event.key === 'Escape') {
      this.users.set([]);
      this.show.set(false);
    }
  }

  selectUser(user: UsuarioMencion) {
    this.mentionSelected.emit(user);
    this.users.set([]);
  }
}
