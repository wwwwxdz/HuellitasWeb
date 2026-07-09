import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';

import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';

import { AvatarComponent } from '../avatar/avatar';

@Component({
  selector: 'app-profile-dropdown',
  standalone: true,
  imports: [RouterModule, AvatarComponent],
  templateUrl: './profile-dropdown.html',
  styleUrl: './profile-dropdown.scss',
})
export class ProfileDropdown {
  protected readonly auth = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  isDropdownOpen = signal<boolean>(false);

  toggleDropdown(): void {
    this.isDropdownOpen.update((open) => !open);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.closeDropdown();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.closeDropdown();
    }
  }
}
