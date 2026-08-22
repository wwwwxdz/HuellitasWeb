import { Component, inject, OnInit } from '@angular/core';
import { TopbarComponent } from '../../shared/components/topbar/topbar';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';
import { AuthService } from '../../core/auth/auth.service';
import { HeroSectionComponent } from './components/hero-section/hero-section';
import { AdoptionSectionComponent } from './components/adoption-section/adoption-section';
import { FeaturesSectionComponent } from './components/features-section/features-section';
import { AlertsMapSectionComponent } from './components/alerts-map-section/alerts-map-section';
import { MissionSectionComponent } from './components/mission-section/mission-section';
import { TestimonialsCtaComponent } from './components/testimonials-cta/testimonials-cta';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    TopbarComponent,
    Navbar, 
    Footer, 
    HeroSectionComponent, 
    AdoptionSectionComponent, 
    FeaturesSectionComponent, 
    AlertsMapSectionComponent,
    MissionSectionComponent,
    TestimonialsCtaComponent
  ],
  styleUrl: './home.scss',
  templateUrl: './home.html',
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
