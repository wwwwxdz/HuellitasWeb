import { Component, HostListener, HostBinding } from '@angular/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss'
})
export class TopbarComponent {
  /** Angular vincula directamente la clase al host element del componente */
  @HostBinding('class.is-hidden') isHidden = false;

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.isHidden = window.scrollY > 5;
  }
}
