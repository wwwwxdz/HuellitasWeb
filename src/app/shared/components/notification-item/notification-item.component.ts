import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notification } from '../../../core/models/notification.model';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { MentionHighlightPipe } from '../../pipes/mention-highlight.pipe';

@Component({
  selector: 'app-notification-item',
  standalone: true,
  imports: [CommonModule, TimeAgoPipe, MentionHighlightPipe],
  templateUrl: './notification-item.component.html',
  styleUrl: './notification-item.component.scss'
})
export class NotificationItemComponent {
  notification = input.required<Notification>();
  showDelete = input(false);
  deleteIcon = input('delete');
  
  clicked = output<Notification>();
  delete = output<string>();

  onDelete(event: Event) {
    event.stopPropagation();
    this.delete.emit(this.notification().id_notificacion);
  }
}
