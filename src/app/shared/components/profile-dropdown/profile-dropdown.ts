import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';

import { AvatarComponent } from '../avatar/avatar';

@Component({
  selector: 'app-profile-dropdown',
  standalone: true,
  imports: [CommonModule, RouterModule, AvatarComponent],
  templateUrl: './profile-dropdown.html',
  styleUrl: './profile-dropdown.scss'
})
export class ProfileDropdown {
  protected readonly auth = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  isDropdownOpen = signal<boolean>(false);

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen.update(open => !open);
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

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeDropdown();
  }
}
