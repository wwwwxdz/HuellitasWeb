import { Pipe, PipeTransform, NgZone, OnDestroy, inject, signal } from '@angular/core';
import { formatTimeAgo } from '../../core/utils/date.utils';

@Pipe({ name: 'timeAgo', pure: false, standalone: true })
export class TimeAgoPipe implements PipeTransform, OnDestroy {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private zone = inject(NgZone);
  private now = signal(new Date());

  transform(value: string | Date): string {
    const currentNow = this.now();
    this.removeTimer();
    if (!value) return '';
    const fecha = new Date(value);
    // Fecha inválida o fecha cero de Go (0001-01-01)
    if (isNaN(fecha.getTime()) || fecha.getFullYear() < 2000) return '';
    
    const diff = Math.floor((currentNow.getTime() - fecha.getTime()) / 1000);
    if (diff < 0) return 'Hace un momento';

    const intervalo = this.getIntervalo(diff);
    this.zone.runOutsideAngular(() => {
      this.timer = setTimeout(() => {
        this.zone.run(() => this.now.set(new Date()));
      }, intervalo * 1000);
    });

    const formatted = formatTimeAgo(fecha);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  private getIntervalo(diff: number): number {
    if (diff < 60)    return 30;
    if (diff < 3600)  return 60;
    if (diff < 86400) return 3600;
    return 86400;
  }

  private removeTimer() {
    if (this.timer) clearTimeout(this.timer);
  }

  ngOnDestroy() { this.removeTimer(); }
}
