import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

/** Protege rutas privadas — redirige a /login si no está autenticado */
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  if (auth.isLoggedIn()) return true;

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

/** Protege rutas públicas (login/register) — redirige al home si ya está autenticado */
export const publicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  if (auth.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};

/** Redirige a /banned si el usuario está baneado */
export const bannedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const u = auth.usuario();

  if (u?.esta_baneado) {
    router.navigate(['/banned']);
    return false;
  }
  return true;
};

/** Protege /banned — solo accesible si el usuario está baneado */
export const onlyBannedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);
  const u = auth.usuario();

  if (u && !u.esta_baneado) {
    router.navigate(['/']);
    return false;
  }

  let isBannedAttempt = false;
  if (isBrowser) {
    isBannedAttempt = localStorage.getItem('is_banned_user') === 'true';
  }

  if (!u && !isBannedAttempt) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
