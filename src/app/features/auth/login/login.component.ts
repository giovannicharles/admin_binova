import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-login">
      <div class="login-panel card-hover">
        <div class="login-brand">
          <div class="brand-icon">
            <svg width="56" height="56" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="36" fill="var(--primary-100)"/>
              <path d="M40 18C40 18 22 29 22 44C22 54 30 62 40 62C50 62 58 54 58 44C58 29 40 18 40 18Z" fill="var(--primary)"/>
              <path d="M32 52L40 37L48 52" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="40" cy="34" r="3.5" fill="white"/>
            </svg>
          </div>
          <div class="brand-text">
            <h1 class="gradient-text">BINOVA</h1>
            <p>Administration · SGAO-SARL</p>
          </div>
        </div>

        <h2>Connexion administrateur</h2>
        <p class="login-sub">Accès réservé au personnel autorisé</p>

        @if (error()) {
          <div class="alert-error">
            <i class="ri-error-warning-line" style="font-size: 18px;"></i>
            {{ error() }}
          </div>
        }

        @if (requires2FA()) {
          <div class="two-fa-section">
            <div class="two-fa-icon">
              <i class="ri-shield-keyhole-line" style="font-size: 48px; color: var(--primary-600);"></i>
            </div>
            <p class="two-fa-label">Code d'authentification à 2 facteurs</p>
            <input class="form-control otp" type="text" inputmode="numeric" [(ngModel)]="totpCode"
                   maxlength="6" placeholder="000000" autofocus>
            <button class="btn btn-primary btn-full" style="margin-top:16px" [disabled]="loading() || totpCode.length < 6" (click)="login()">
              @if (loading()) { <span class="spinner"></span> } Vérifier
            </button>
            <button class="btn-link" (click)="requires2FA.set(false)">← Retour à la connexion</button>
          </div>
        } @else {
          <form (ngSubmit)="login()">
            <div class="form-group">
              <label>Email ou téléphone</label>
              <div class="input-group">
                <span class="input-icon">
                  <i class="ri-mail-line" style="font-size: 18px;"></i>
                </span>
                <input class="form-control" type="text" [(ngModel)]="identifier" name="id"
                       placeholder="admin@binova.cm" required>
              </div>
            </div>
            <div class="form-group">
              <label>Mot de passe</label>
              <div class="input-group">
                <span class="input-icon">
                  <i class="ri-lock-line" style="font-size: 18px;"></i>
                </span>
                <input class="form-control" [type]="showPwd() ? 'text' : 'password'"
                       [(ngModel)]="password" name="pwd" placeholder="••••••••" required>
                <button type="button" class="input-suffix" (click)="toggleShowPwd()">
                  @if (showPwd()) {
                    <i class="ri-eye-off-line" style="font-size: 18px;"></i>
                  } @else {
                    <i class="ri-eye-line" style="font-size: 18px;"></i>
                  }
                </button>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-full" [disabled]="loading() || !identifier || !password">
              @if (loading()) { <span class="spinner"></span> } Se connecter
            </button>
          </form>
        }

        <div class="login-footer-note">
          <i class="ri-shield-check-line" style="font-size: 14px;"></i>
          Accès sécurisé BINOVA 2026 · SGAO-SARL
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-login {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(160deg, var(--bg-soft) 0%, var(--bg-soft-2) 100%);
      padding: 20px;
    }

    .login-panel {
      background: var(--bg);
      border-radius: var(--radius-2xl);
      padding: 44px;
      width: 100%;
      max-width: 440px;
      box-shadow: var(--shadow-xl);
      border: 1px solid var(--border-light);
    }

    .login-brand {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 36px;

      .brand-icon {
        flex-shrink: 0;
        filter: drop-shadow(0 4px 12px rgba(44, 122, 62, 0.2));
      }

      .brand-text {
        h1 { font-size: 26px; font-weight: 800; letter-spacing: 1.5px; margin: 0; }
        p { font-size: 12px; color: var(--text-muted); font-weight: 600; margin: 4px 0 0 0; }
      }
    }

    h2 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
    .login-sub { font-size: 14px; color: var(--text-muted); margin-bottom: 28px; }

    .alert-error {
      background: var(--error-soft); color: #DC2626;
      padding: 14px 18px; border-radius: var(--radius); font-size: 13px;
      margin-bottom: 24px;
      display: flex; align-items: center; gap: 10px;
      font-weight: 600;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .two-fa-section {
      text-align: center;
      padding: 20px 0;

      .two-fa-icon {
        display: flex; justify-content: center; margin-bottom: 16px;
      }

      .two-fa-label {
        color: var(--text-muted); margin-bottom: 20px; font-size: 14px;
      }
    }

    .otp {
      text-align: center; font-size: 28px; font-weight: 700;
      letter-spacing: 12px; padding: 16px;
      border: 2px solid var(--border);
      &:focus {
        border-color: var(--primary-600);
        box-shadow: 0 0 0 4px rgba(44, 122, 62, 0.1);
      }
    }

    .btn-link {
      display: block; text-align: center; margin-top: 16px;
      background: none; border: none; color: var(--text-muted);
      font-size: 14px; cursor: pointer; text-decoration: none;
      font-weight: 600;
      &:hover { color: var(--primary-700); }
    }

    .login-footer-note {
      text-align: center; margin-top: 32px;
      font-size: 12px; color: var(--text-light);
      padding-top: 24px;
      border-top: 1px solid var(--border-light);
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }

    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.7s linear infinite; display: inline-block;
    }
  `]
})
export class AdminLoginComponent {
  identifier = '';
  password = '';
  totpCode = '';
  loading = signal(false);
  error = signal('');
  showPwd = signal(false);
  requires2FA = signal(false);

  constructor(private authService: AuthService, private router: Router) { }

  toggleShowPwd() {
    this.showPwd.update(v => !v);
  }

  login() {
    this.loading.set(true);
    this.error.set('');
    this.authService.login(
      this.identifier, this.password,
      this.requires2FA() ? this.totpCode : undefined
    ).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res.requiresTwoFactor) { this.requires2FA.set(true); return; }
        // Vérifier le rôle
        const allowed = ['admin', 'super_admin', 'admin_municipal', 'collector'];
        if (!allowed.includes(res.user?.role)) {
          this.error.set('Accès refusé : compte non autorisé');
          this.authService.logout();
          return;
        }
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Identifiants incorrects');
      }
    });
  }
}