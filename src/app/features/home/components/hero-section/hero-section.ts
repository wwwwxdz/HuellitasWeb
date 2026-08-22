import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [RouterLink, ButtonComponent],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.scss',
})
export class HeroSectionComponent {}
