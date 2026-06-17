import { Routes } from '@angular/router';
import { authGuard, publicGuard, onlyBannedGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent),
  },
  {
    path: 'pets/lost',
    loadComponent: () => import('./features/pets/lost/lost').then(m => m.LostComponent),
  },
  {
    path: 'pets/found',
    loadComponent: () => import('./features/pets/found/found').then(m => m.FoundComponent),
  },
  {
    path: 'pets/map',
    loadComponent: () => import('./features/pets/map/map').then(m => m.MapComponent),
  },
  {
    path: 'pets/report',
    loadComponent: () => import('./features/pets/report/report').then(m => m.ReportComponent),
    canActivate: [authGuard],
  },
  {
    path: 'pets/reports',
    loadComponent: () => import('./features/pets/reports/reports').then(m => m.ReportsComponent),
  },
  {
    path: 'pets/reports/detail/:id',
    loadComponent: () => import('./features/pets/detail/detail').then(m => m.PetDetailComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/auth/auth').then(m => m.AuthComponent),
    canActivate: [publicGuard],
  },
  {
    path: 'register',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'recover',
    loadComponent: () => import('./features/auth/recover/recover').then(m => m.RecoverComponent),
    canActivate: [publicGuard],
  },
  {
    path: 'banned',
    loadComponent: () => import('./features/auth/banned/banned').then(m => m.BannedComponent),
    canActivate: [onlyBannedGuard],
  },
  {
    path: 'perfil',
    loadComponent: () => import('./features/perfil/perfil').then(m => m.PerfilComponent),
    canActivate: [authGuard],
  },
  {
    path: 'ajustes',
    loadComponent: () => import('./features/ajustes/ajustes').then(m => m.AjustesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'chats',
    loadComponent: () => import('./features/chats/chat-center.component').then(m => m.ChatCenterComponent),
    canActivate: [authGuard],
  },
  {
    path: 'mensajes',
    loadComponent: () => import('./features/chats/preview/messages-preview.component').then(m => m.MessagesPreviewComponent),
    canActivate: [authGuard],
  },
  {
    path: 'notifications',
    loadComponent: () => import('./features/notifications/notifications-center.component').then(m => m.NotificationsCenterComponent),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard',
    redirectTo: 'perfil',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
  }
];
