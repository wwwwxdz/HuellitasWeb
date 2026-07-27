import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-testimonials-cta',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './testimonials-cta.html',
  styleUrl: './testimonials-cta.scss'
})
export class TestimonialsCtaComponent {}
