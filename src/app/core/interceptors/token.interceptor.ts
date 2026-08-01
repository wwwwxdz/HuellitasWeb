import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError, EMPTY } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  // No agregar token a peticiones externas (Cloudinary, Facebook, CDNs, etc.)
  const isExternalApi =
    req.url.startsWith('http') &&
    !req.url.includes('localhost') &&
    !req.url.includes('127.0.0.1') &&
    !req.url.includes('sslip.io');

  if (isExternalApi) {
    return next(req);
  }

  const token = isBrowser ? localStorage.getItem('token') : null;
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!isBrowser) return EMPTY;

      const msg = (error.error?.error || '').toLowerCase();
      const isBanned = msg.includes('baneado') || msg.includes('suspendido');

      if (isBanned && isBrowser) {
        localStorage.setItem('is_banned_user', 'true');
        router.navigate(['/banned']);
        return throwError(() => error);
      }

      if (error.status === 401 && isBrowser) {
        localStorage.removeItem('is_banned_user');
        authService.logout(true);
      }

      if (error.status === 403) {
        // Refrescar permisos en tiempo real ante rechazo del backend
        authService.refreshUser().subscribe();
      }

      return throwError(() => error);
    })
  );
};
