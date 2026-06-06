import { Component, input, model, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TabOption {
  label: string;
  value: any;
  icon?: string;
  count?: number | string;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tabs-container" [ngClass]="[variant()]">
      @for (option of computedOptions(); track option.value) {
        <button 
          type="button"
          class="tab-item" 
          [class.active]="value() === option.value"
          (click)="selectTab(option.value)"
        >
          @if (option.icon) {
            <i class="material-icons">{{ option.icon }}</i>
          }
          <span>{{ option.label }}</span>
          @if (option.count !== undefined) {
            <span class="tab-count">{{ option.count }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .tabs-container {
      display: flex;
      background: var(--bg-input, rgba(255, 255, 255, 0.03));
      padding: 6px;
      border-radius: 16px;
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      width: fit-content;
      gap: 4px;
      backdrop-filter: blur(8px);
      transition: var(--theme-transition);

      &.full-width {
        width: 100% !important;
        display: flex;
        .tab-item {
          flex: 1;
        }
      }

      .tab-item {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 24px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--text-muted, #94a3b8);
        font-size: 0.9rem;
        font-weight: 700;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        white-space: nowrap;
        outline: none;

        i {
          font-size: 1.2rem;
          transition: transform 0.2s;
        }

        &:hover {
          color: var(--text-main, #f8fafc);
          background: rgba(var(--primary-rgb, 60, 129, 138), 0.05);

          i {
            transform: scale(1.05);
          }
        }

        &:focus {
          outline: none;
        }

        &.active {
          background: var(--bg-card, #18181b);
          color: var(--primary-color, #3c818a);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-color: rgba(255, 255, 255, 0.02);

          i {
            color: var(--primary-color, #3c818a);
          }

          .tab-count {
            background: var(--primary-color, #3c818a);
            color: white;
          }
        }
      }

      .tab-count {
        background: rgba(var(--primary-rgb, 60, 129, 138), 0.1);
        color: var(--primary-color, #3c818a);
        padding: 2px 8px;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 800;
        transition: all 0.3s;
      }

      &.primary {
        .tab-item.active {
          background: var(--primary-color, #3c818a);
          color: white;
          box-shadow: 0 8px 16px rgba(var(--primary-rgb, 60, 129, 138), 0.2);

          i {
            color: white;
          }
        }
      }
    }
  `]
})
export class Tabs {
  tabs = input<TabOption[]>([]);
  options = input<TabOption[]>([]);
  
  value = model<any>(undefined);
  variant = input<'default' | 'primary' | 'full-width'>('default');
  tabChange = output<any>();

  computedOptions = computed(() => {
    const t = this.tabs();
    const o = this.options();
    return t.length > 0 ? t : o;
  });

  selectTab(val: any) {
    if (this.value() === val) return;
    this.value.set(val);
    this.tabChange.emit(val);
  }
}
