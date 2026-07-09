import { Component, input, output, computed } from '@angular/core';

import { Notification } from '../../../core/models/notification.model';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { MentionHighlightPipe } from '../../pipes/mention-highlight.pipe';

@Component({
  selector: 'app-notification-item',
  standalone: true,
  imports: [TimeAgoPipe, MentionHighlightPipe],
  templateUrl: './notification-item.component.html',
  styleUrl: './notification-item.component.scss',
})
export class NotificationItemComponent {
  notification = input.required<Notification>();
  showDelete = input(false);
  deleteIcon = input('delete');

  clicked = output<Notification>();
  delete = output<string>();

  formattedMessage = computed(() => {
    const notif = this.notification();
    let mensaje = notif.mensaje || '';
    const actorNombre = notif.actor?.nombre;

    if (actorNombre) {
      const nombreLower = actorNombre.toLowerCase();
      const mensajeLower = mensaje.toLowerCase().trim();

      // Caso 1: empieza exactamente con el nombre del actor (ej: "guille publicó...")
      if (mensajeLower.startsWith(nombreLower)) {
        mensaje = mensaje.slice(actorNombre.length).trim();
      }
      // Caso 2: empieza con un signo de exclamación seguido del nombre (ej: "¡guille reportó...")
      else if (mensajeLower.startsWith('¡' + nombreLower)) {
        mensaje = mensaje.slice(actorNombre.length + 1).trim();
      }
    }

    return mensaje;
  });

  onDelete(event: Event) {
    event.stopPropagation();
    this.delete.emit(this.notification().id_notificacion);
  }
}
