import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.AdminLoginComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/shell/shell.component').then(m => m.AdminShellComponent),
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'map', loadComponent: () => import('./features/map/map.component').then(m => m.AdminMapComponent) },
      { path: 'bins', loadComponent: () => import('./features/bins/bins.component').then(m => m.AdminBinsComponent) },
      { path: 'reports', loadComponent: () => import('./features/reports/reports.component').then(m => m.AdminReportsComponent) },
      { path: 'tours', loadComponent: () => import('./features/tours/tours.component').then(m => m.AdminToursComponent) },
      { path: 'stats', loadComponent: () => import('./features/stats/stats.component').then(m => m.AdminStatsComponent) },
      { path: 'users', loadComponent: () => import('./features/users/users.component').then(m => m.AdminUsersComponent) },
      { path: 'awareness', loadComponent: () => import('./features/awareness/awareness.component').then(m => m.AdminAwarenessComponent) },
      { path: 'chat', loadComponent: () => import('./features/chat/chat.component').then(m => m.AdminChatComponent) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(m => m.AdminSettingsComponent) }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
