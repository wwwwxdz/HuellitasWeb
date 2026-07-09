import { Component, OnInit, inject, computed } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { Notification } from '../../core/models/notification.model';
import { NotificationItemComponent } from '../../shared/components/notification-item/notification-item.component';
import { take } from 'rxjs';

@Component({
  selector: 'app-notifications-center',
  standalone: true,
  imports: [RouterModule, NotificationItemComponent],
  templateUrl: './notifications-center.component.html',
  styleUrl: './notifications-center.component.scss',
})
export class NotificationsCenterComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  /** Consumimos directamente las signals del servicio (reactivas y dentro de NgZone) */
  notifications = this.notificationService.notifications;
  isLoading = this.notificationService.isLoading;
  total = this.notificationService.total;
  hasNotifications = this.notificationService.hasNotifications;
  canLoadMore = computed(() => this.notifications().length < this.total());

  private currentPage = 1;
  private readonly limit = 20;

  ngOnInit(): void {
    this.currentPage = 1;
    this.notificationService
      .getNotifications(this.currentPage, this.limit)
      .pipe(take(1))
      .subscribe();
  }

  loadMore(): void {
    if (this.canLoadMore()) {
      this.currentPage++;
      this.notificationService
        .getNotifications(this.currentPage, this.limit)
        .pipe(take(1))
        .subscribe();
    }
  }

  markAsRead(n: Notification): void {
    this.notificationService.handleNotificationAction(n);
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead().pipe(take(1)).subscribe();
  }

  clearAll(): void {
    this.notificationService.clearAllNotifications().pipe(take(1)).subscribe();
  }

  deleteNotification(id: string): void {
    this.notificationService.deleteNotification(id).pipe(take(1)).subscribe();
  }
}
