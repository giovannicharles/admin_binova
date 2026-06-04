// ===== core/auth/auth.service.ts =====
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<any>(null);
  token = '';

  get currentUser() { return this.user(); }

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('binova_admin_user');
    this.token = localStorage.getItem('binova_admin_token') || '';
    if (stored) this.user.set(JSON.parse(stored));
  }

  login(identifier: string, password: string, totpCode?: string) {
    return this.http.post(`${environment.apiUrl}/auth/login`, { identifier, password, totpCode }).pipe(
      tap((res: any) => {
        if (res.token) {
          this.token = res.token;
          this.user.set(res.user);
          localStorage.setItem('binova_admin_token', res.token);
          localStorage.setItem('binova_admin_refresh', res.refreshToken || '');
          localStorage.setItem('binova_admin_user', JSON.stringify(res.user));
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('binova_admin_token');
    localStorage.removeItem('binova_admin_refresh');
    localStorage.removeItem('binova_admin_user');
    this.user.set(null);
    this.token = '';
    this.router.navigate(['/auth/login']);
  }

  isLoggedIn(): boolean { return !!this.token; }

  hasRole(...roles: string[]): boolean {
    return roles.includes(this.user()?.role);
  }

  getMe() {
    return this.http.get(`${environment.apiUrl}/auth/me`).pipe(
      tap((res: any) => {
        this.user.set(res.user);
        localStorage.setItem('binova_admin_user', JSON.stringify(res.user));
      })
    );
  }
}
