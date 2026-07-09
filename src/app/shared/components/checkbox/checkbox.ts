import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [],
  template: `
    <div
      class="checkbox-wrapper"
      [class.disabled]="disabled()"
      (click)="toggle()"
      (keydown.space)="toggle()"
      (keydown.enter)="toggle()"
      tabindex="0"
      role="checkbox"
      [attr.aria-checked]="value()"
      [attr.aria-disabled]="disabled()"
    >
      <div class="checkbox-box" [class.checked]="value()">
        @if (value()) {
          <i class="material-icons check-icon">check</i>
        }
      </div>
      <span class="checkbox-label">
        <ng-content></ng-content>
      </span>
    </div>
  `,
  styles: [
    `
      .checkbox-wrapper {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        user-select: none;
        outline: none;
        transition: opacity var(--theme-transition, 0.3s ease);
        padding: 4px 2px;
        border-radius: 8px;

        &:focus-visible {
          .checkbox-box {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.25);
          }
        }

        &.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
      }

      .checkbox-box {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        border: 2px solid var(--border-color, #334155);
        background-color: rgba(15, 23, 42, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
        flex-shrink: 0;

        .checkbox-wrapper:hover & {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15);
        }

        &.checked {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
          border-color: var(--primary-color);
          box-shadow: 0 4px 10px rgba(var(--primary-rgb), 0.25);
        }
      }

      .check-icon {
        font-size: 1.15rem;
        color: #ffffff;
        font-weight: 900;
        animation: scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .checkbox-label {
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--text-main);
        transition: color var(--theme-transition, 0.3s ease);
      }

      @keyframes scaleIn {
        from {
          transform: scale(0);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
    `,
  ],
})
export class CheckboxComponent {
  value = model<boolean>(false);
  disabled = input<boolean>(false);

  toggle(): void {
    if (this.disabled()) return;
    this.value.set(!this.value());
  }
}
