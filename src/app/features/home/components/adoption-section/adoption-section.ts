import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { ButtonComponent } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-adoption-section',
  standalone: true,
  imports: [RouterLink, ModalComponent, ButtonComponent],
  templateUrl: './adoption-section.html',
  styleUrl: './adoption-section.scss'
})
export class AdoptionSectionComponent {
  // Modal de Adopción interactivo
  selectedAdoptPet = signal<any | null>(null);
  isAdoptModalOpen = signal<boolean>(false);

  openAdoptDetails(petKey: string): void {
    const petsData: Record<string, any> = {
      beagle: {
        nombre: 'Toby',
        raza: 'Beagle',
        edad: '2 meses',
        descripcion: 'Toby es un beagle súper juguetón, cariñoso y lleno de energía. Le encanta correr en el jardín y socializar con otros perritos. Está desparasitado y vacunado.',
        imagen: '/images/adopt/beagle.png',
        contacto: '987 654 321'
      },
      golden: {
        nombre: 'Simba',
        raza: 'Golden Retriever',
        edad: '3 meses',
        descripcion: 'Simba es un cachorro sumamente dulce, obediente y amigable. Le encanta estar cerca de las personas y es perfecto para familias con niños. Cuenta con cartilla completa.',
        imagen: '/images/adopt/golden.png',
        contacto: '987 654 321'
      },
      corgi: {
        nombre: 'Max',
        raza: 'Corgi',
        edad: '2 meses',
        descripcion: 'Max es un corgi activo, inteligente y muy leal. Le encanta aprender trucos nuevos y jugar a traer la pelota. Ideal para departamentos o casas.',
        imagen: '/images/adopt/corgi.png',
        contacto: '987 654 321'
      },
      husky: {
        nombre: 'Luna',
        raza: 'Siberian Husky',
        edad: '2 meses',
        descripcion: 'Luna es una husky hermosa con unos ojos azules impactantes. Es curiosa, independiente pero muy cariñosa una vez que entra en confianza. Busca una familia activa.',
        imagen: '/images/adopt/husky.png',
        contacto: '987 654 321'
      }
    };
    this.selectedAdoptPet.set(petsData[petKey]);
    this.isAdoptModalOpen.set(true);
  }

  closeAdoptModal(): void {
    this.isAdoptModalOpen.set(false);
    this.selectedAdoptPet.set(null);
  }

  contactOwner(): void {
    if (this.selectedAdoptPet()) {
      alert(`Contactando para la adopción de ${this.selectedAdoptPet().nombre} al teléfono ${this.selectedAdoptPet().contacto}`);
    }
  }
}
