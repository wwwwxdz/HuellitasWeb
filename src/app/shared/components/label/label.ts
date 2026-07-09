import { Component, input } from '@angular/core';

@Component({
  selector: 'app-label',
  standalone: true,
  imports: [],
  template: `
    <label [attr.for]="forId()" class="custom-label">
      <ng-content></ng-content>
      @if (required()) {
        <span class="required-indicator">*</span>
      }
    </label>
  `,
  styles: [
    `
      .custom-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-main);
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 6px;
        user-select: none;
        transition: color var(--theme-transition, 0.3s ease);
      }

      .required-indicator {
        color: var(--danger, #ef4444);
        font-weight: 700;
      }
    `,
  ],
})
export class LabelComponent {
  forId = input<string>('');
  required = input<boolean>(false);
}
