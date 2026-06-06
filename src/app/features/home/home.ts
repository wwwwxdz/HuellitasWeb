import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, Navbar, Footer],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit {
  protected readonly auth = inject(AuthService);

  ngOnInit(): void {
    // Inicializar efectos de reveal on scroll
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const reveals = document.querySelectorAll('.scroll-reveal');
        reveals.forEach((el) => el.classList.add('revealed'));
      }, 100);
    }
  }
}
