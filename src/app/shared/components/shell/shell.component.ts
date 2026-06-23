import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  roles?: string[];
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="admin-shell">
      <!-- Sidebar (desktop) -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">
        <div class="sidebar-header">
          <div class="logo">
            <div class="logo-icon">
              <svg width="32" height="32" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="36" fill="var(--primary-100)"/>
                <path d="M40 16C40 16 22 27 22 43C22 53.5 30 62 40 62C50 62 58 53.5 58 43C58 27 40 16 40 16Z" fill="var(--primary)"/>
                <path d="M31 52L40 36L49 52" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="40" cy="33" r="3.5" fill="white"/>
              </svg>
            </div>
            @if (!sidebarCollapsed()) {
              <div class="logo-text">
                <span class="logo-name gradient-text">BINOVA</span>
                <span class="logo-sub">Admin</span>
              </div>
            }
          </div>
          <button class="collapse-btn" (click)="toggleSidebar()">
            <i class="ri-arrow-left-s-line" 
              [style.transform]="sidebarCollapsed() ? 'rotate(180deg)' : 'rotate(0deg)'"
              style="transition: transform 0.3s ease; font-size: 20px;"></i>
          </button>
        </div>

        <nav class="sidebar-nav">
          @for (item of navItems; track item.path) {
            <a class="nav-item" [routerLink]="item.path" routerLinkActive="active"
               [title]="item.label">
              <span class="nav-icon">
                <i [class]="item.icon" class="soft-icon"></i>
              </span>
              @if (!sidebarCollapsed()) {
                <span class="nav-label">{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          @if (!sidebarCollapsed()) {
            <div class="user-info">
              <div class="user-avatar">{{ user()?.name?.charAt(0) }}</div>
              <div class="user-details">
                <p class="user-name">{{ user()?.name }}</p>
                <p class="user-role">{{ roleLabel() }}</p>
              </div>
            </div>
          }
          <button class="logout-btn" (click)="logout()" [title]="'Se déconnecter'">
            <i class="ri-logout-box-r-line soft-icon"></i>
            @if (!sidebarCollapsed()) { <span>Déconnexion</span> }
          </button>
        </div>
      </aside>

      <!-- Main area -->
      <div class="main-area">
        <!-- Top bar -->
        <header class="admin-topbar glass">
          <button class="menu-btn" (click)="toggleSidebar()">
            <i class="ri-menu-line" style="font-size: 22px;"></i>
          </button>

          <div class="topbar-title">{{ currentPageTitle() }}</div>

          <div class="topbar-right">
            <div class="socket-status" [class.connected]="socketConnected()">
              <span class="socket-dot"></span>
              {{ socketConnected() ? 'Live' : 'Hors ligne' }}
            </div>
            <div class="admin-avatar">{{ user()?.name?.charAt(0) }}</div>
          </div>
        </header>

        <!-- Page content -->
        <main class="admin-content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Mobile bottom nav -->
      <nav class="mobile-nav glass">
        @for (item of mobileNavItems; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active" class="mobile-nav-item">
            <i [class]="item.icon" class="soft-icon" style="font-size: 22px;"></i>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>
    </div>
  `,
  styles: [`
    .admin-shell {
      display: flex;
      min-height: 100dvh;
      background: var(--bg-soft);
    }

    /* SIDEBAR - Enhanced */
    .sidebar {
      width: 260px;
      min-height: 100dvh;
      background: var(--bg);
      border-right: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      transition: all var(--transition-smooth);
      position: fixed;
      top: 0; left: 0; bottom: 0;
      z-index: 300;
      box-shadow: var(--shadow-soft);

      &.collapsed { width: 80px; }
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 20px;
      border-bottom: 1px solid var(--border-light);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      overflow: hidden;
    }

    .logo-icon {
      flex-shrink: 0;
      filter: drop-shadow(0 2px 8px rgba(44, 122, 62, 0.2));
    }

    .logo-text {
      display: flex;
      flex-direction: column;
    }

    .logo-name {
      display: block;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 1.5px;
      white-space: nowrap;
    }

    .logo-sub {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .collapse-btn {
      width: 32px; height: 32px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: var(--bg-soft);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      flex-shrink: 0;
      transition: all var(--transition);
      &:hover { 
        background: var(--primary-50);
        color: var(--primary-700);
        border-color: var(--primary-200);
      }
    }

    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: var(--radius);
      text-decoration: none;
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 600;
      transition: all var(--transition-smooth);
      white-space: nowrap;
      overflow: hidden;

      &:hover { 
        background: var(--bg-soft); 
        color: var(--text);
        transform: translateX(2px);
      }
      &.active { 
        background: linear-gradient(135deg, var(--primary-50), var(--primary-100));
        color: var(--primary-700);
        box-shadow: var(--shadow-soft);
      }
    }

    .nav-icon {
      width: 24px; height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .nav-label { overflow: hidden; text-overflow: ellipsis; }

    .sidebar-footer {
      padding: 16px 12px;
      border-top: 1px solid var(--border-light);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: var(--radius);
      background: var(--bg-soft);
      margin-bottom: 8px;
      overflow: hidden;
    }

    .user-avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
      box-shadow: var(--shadow-green);
    }

    .user-details {
      flex: 1;
      min-width: 0;
    }

    .user-name { font-size: 13px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-role { font-size: 11px; color: var(--text-muted); }

    .logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--error);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition);
      &:hover { 
        background: var(--error-soft);
        border-color: var(--error);
      }
    }

    /* MAIN AREA - Enhanced */
    .main-area {
      flex: 1;
      margin-left: 260px;
      transition: margin-left var(--transition-smooth);
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }

    .sidebar.collapsed ~ .main-area { margin-left: 80px; }

    .admin-topbar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 0 24px;
      height: 70px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .menu-btn {
      width: 42px; height: 42px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: var(--bg);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      display: none;
      transition: all var(--transition);

      &:hover { 
        background: var(--bg-soft);
        color: var(--primary-700);
      }
    }

    .topbar-title {
      font-size: 20px;
      font-weight: 700;
      flex: 1;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .socket-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg-soft);
      padding: 8px 14px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border);
      transition: all var(--transition);
    }

    .socket-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--border);
    }
    .socket-status.connected .socket-dot {
      background: var(--success);
      animation: pulse-green 2s infinite;
    }

    .admin-avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      box-shadow: var(--shadow-green);
      cursor: pointer;
      transition: all var(--transition);
      &:hover {
        transform: scale(1.05);
      }
    }

    .admin-content {
      flex: 1;
      padding: 28px;
      overflow-y: auto;
    }

    /* MOBILE NAV - Enhanced */
    .mobile-nav {
      display: none;
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 200;
      padding-bottom: env(safe-area-inset-bottom);
    }

    .mobile-nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 8px;
      text-decoration: none;
      color: var(--text-light);
      font-size: 11px;
      font-weight: 600;
      transition: all var(--transition);

      &.active { 
        color: var(--primary-600);
      }
      &:hover {
        color: var(--primary-700);
      }
    }

    @media (max-width: 768px) {
      .sidebar { display: none; }
      .main-area { margin-left: 0; }
      .menu-btn { display: flex; }
      .mobile-nav { display: flex; }
      .admin-content { padding: 20px; padding-bottom: calc(90px + env(safe-area-inset-bottom)); }
      .admin-topbar { padding: 0 16px; }
    }
  `]
})
export class AdminShellComponent implements OnInit {
  user = this.authService.user;
  sidebarCollapsed = signal(false);
  socketConnected = signal(false);

  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Tableau de bord', icon: 'ri-dashboard-line' },
    { path: '/map', label: 'Carte temps réel', icon: 'ri-map-pin-line' },
    { path: '/bins', label: 'Gestion des bacs', icon: 'ri-delete-bin-line' },
    { path: '/reports', label: 'Signalements', icon: 'ri-clipboard-line' },
    { path: '/tours', label: 'Tournées', icon: 'ri-truck-line' },
    { path: '/stats', label: 'Statistiques', icon: 'ri-bar-chart-box-line' },
    { path: '/users', label: 'Utilisateurs', icon: 'ri-user-line' },
    { path: '/chat', label: 'Messagerie', icon: 'ri-chat-3-line' },
    { path: '/awareness', label: 'Sensibilisation', icon: 'ri-book-open-line' },
    { path: '/settings', label: 'Paramètres', icon: 'ri-settings-4-line' }
  ];

  mobileNavItems = this.navItems.slice(0, 5);

  pageTitles: Record<string, string> = {
    '/dashboard': 'Tableau de bord',
    '/map': 'Carte temps réel',
    '/bins': 'Gestion des bacs',
    '/reports': 'Signalements',
    '/tours': 'Tournées',
    '/stats': 'Statistiques',
    '/users': 'Utilisateurs',
    '/chat': 'Messagerie',
    '/awareness': 'Sensibilisation',
    '/settings': 'Paramètres'
  };

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    if (window.innerWidth < 768) this.sidebarCollapsed.set(true);
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  currentPageTitle(): string {
    const url = this.router.url;
    for (const [path, title] of Object.entries(this.pageTitles)) {
      if (url.startsWith(path)) return title;
    }
    return 'BINOVA Admin';
  }

  roleLabel(): string {
    const roles: Record<string, string> = {
      admin: 'Administrateur', super_admin: 'Super Admin',
      admin_municipal: 'Admin Municipal', collector: 'Collecteur'
    };
    return roles[this.user()?.role || ''] || 'Admin';
  }

  logout() { this.authService.logout(); }
}