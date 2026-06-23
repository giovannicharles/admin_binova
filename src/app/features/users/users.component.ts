import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-users">
      <div class="toolbar">
        <div class="search-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="search-input" type="text" [(ngModel)]="search" (input)="loadUsers()" placeholder="Nom, CNI, téléphone, email...">
        </div>
        <select class="filter-select" [(ngModel)]="roleFilter" (change)="loadUsers()">
          <option value="">Tous les rôles</option>
          <option value="citizen">Citoyen</option>
          <option value="collector">Collecteur</option>
          <option value="admin_municipal">Admin Municipal</option>
          <option value="admin">Administrateur</option>
        </select>
        <button class="btn btn-primary" (click)="openForm(null)">+ Ajouter utilisateur</button>
      </div>

      <!-- Stats row -->
      <div class="user-stats">
        @for (stat of userStats(); track stat.label) {
          <div class="user-stat-card">
            <span class="us-val">{{ stat.value }}</span>
            <span class="us-lbl">{{ stat.label }}</span>
          </div>
        }
      </div>

      <!-- Gamification Leaderboard -->
      <div class="gamification-section">
        <div class="section-header">
          <h3><i class="ri-trophy-line" style="font-size: 18px; margin-right: 8px;"></i> Classement des citoyens</h3>
          <button class="btn btn-outline btn-sm" (click)="showLeaderboard.set(!showLeaderboard())">
            {{ showLeaderboard() ? 'Masquer' : 'Afficher' }}
          </button>
        </div>
        @if (showLeaderboard()) {
          <div class="leaderboard">
            @for (user of leaderboard(); track $index) {
              <div class="leaderboard-item" [class.top-three]="$index < 3">
                <span class="rank" [class]="'rank-' + ($index + 1)">{{ $index + 1 }}</span>
                <div class="lb-avatar">{{ user.name?.charAt(0) }}</div>
                <div class="lb-info">
                  <strong>{{ user.name }}</strong>
                  <span>{{ user.level || 'Bronze' }}</span>
                </div>
                <div class="lb-points">
                  <i class="ri-star-fill" style="color: #FFD700; font-size: 14px;"></i> {{ user.points || 0 }}
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Table -->
      @if (loading()) {
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (s of [1,2,3,4,5]; track s) { <div class="shimmer" style="height:60px;border-radius:10px"></div> }
        </div>
      } @else {
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nom</th><th>CNI</th><th>Téléphone</th>
                <th>Email</th><th>Zone</th><th>Rôle</th>
                <th>Points</th><th>Statut</th><th>Inscription</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user._id) {
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="user-avatar-sm">{{ user.name?.charAt(0) }}</div>
                      <div>
                        <div style="font-weight:700;font-size:13px">{{ user.name }}</div>
                        <div style="font-size:11px;color:var(--text-muted)">{{ user.level || 'Bronze' }}</div>
                      </div>
                    </div>
                   </td>
                  <td class="mono">{{ user.cniMasked || maskCNI(user.cni) }}</td>
                  <td>{{ maskPhone(user.phone) }}</td>
                  <td style="font-size:12px">{{ user.email }}</td>
                  <td>{{ user.zone }}</td>
                  <td><span class="role-badge" [class]="roleBadge(user.role)">{{ roleLabel(user.role) }}</span></td>
                  <td style="font-weight:700;color:var(--primary)"><i class="ri-star-line" style="font-size: 14px; margin-right: 4px;"></i> {{ user.points || 0 }}</td>
                  <td>
                    <span class="status-pill" [class]="user.isActive ? 'status-active' : 'status-offline'">
                      <i [class]="user.isActive ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'" style="font-size: 14px; margin-right: 4px;"></i> {{ user.isActive ? 'Actif' : 'Suspendu' }}
                    </span>
                   </td>
                  <td class="date-cell">{{ formatDate(user.createdAt) }}</td>
                  <td>
                    <div class="action-btns">
                      <button class="icon-action" title="Modifier" (click)="openForm(user)"><i class="ri-edit-line" style="font-size: 16px;"></i></button>
                      <button class="icon-action" title="Réinitialiser MDP" (click)="resetPassword(user)"><i class="ri-lock-line" style="font-size: 16px;"></i></button>
                      @if (user.isActive) {
                        <button class="icon-action danger" title="Suspendre" (click)="toggleUserStatus(user)"><i class="ri-close-circle-line" style="font-size: 16px;"></i></button>
                      } @else {
                        <button class="icon-action" title="Activer" (click)="toggleUserStatus(user)"><i class="ri-checkbox-circle-line" style="font-size: 16px;"></i></button>
                      }
                    </div>
                   </td>
                </tr>
              } @empty {
                <tr><td colspan="10" class="empty-row">Aucun utilisateur trouvé</td></tr>
              }
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <button class="btn btn-outline btn-sm" [disabled]="page() <= 1" (click)="prevPage()">← Précédent</button>
          <span>Page {{ page() }} / {{ totalPages() }}</span>
          <button class="btn btn-outline btn-sm" [disabled]="page() >= totalPages()" (click)="nextPage()">Suivant →</button>
        </div>
      }
    </div>

    <!-- User Form Modal -->
    @if (showForm()) {
      <div class="modal-overlay" (click)="showForm.set(false)">
        <div class="modal animate-pop-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingUser() ? 'Modifier utilisateur' : 'Nouvel utilisateur' }}</h3>
            <button class="modal-close" (click)="showForm.set(false)">✕</button>
          </div>
          <div class="modal-body">
            @if (formError()) { <div class="alert-error-sm">{{ formError() }}</div> }
            <div class="form-grid">
              <div class="form-group span-2">
                <label>Nom complet *</label>
                <input class="form-control" [(ngModel)]="form.name" placeholder="Jean Dupont">
              </div>
              <div class="form-group">
                <label>CNI *</label>
                <input class="form-control" [(ngModel)]="form.cni" placeholder="CM-XXXXXXXXX" style="text-transform:uppercase">
              </div>
              <div class="form-group">
                <label>Téléphone *</label>
                <input class="form-control" [(ngModel)]="form.phone" placeholder="+237 6XX XXX XXX">
              </div>
              <div class="form-group span-2">
                <label>Email *</label>
                <input class="form-control" type="email" [(ngModel)]="form.email" placeholder="email@exemple.cm">
              </div>
              <div class="form-group">
                <label>Zone *</label>
                <select class="form-control" [(ngModel)]="form.zone">
                  @for (z of zones; track z) { <option [value]="z">{{ z }}</option> }
                </select>
              </div>
              <div class="form-group">
                <label>Rôle *</label>
                <select class="form-control" [(ngModel)]="form.role">
                  <option value="citizen">Citoyen</option>
                  <option value="collector">Collecteur</option>
                  <option value="admin_municipal">Admin Municipal</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              @if (!editingUser()) {
                <div class="form-group span-2">
                  <label>Mot de passe provisoire *</label>
                  <input class="form-control" type="password" [(ngModel)]="form.password" placeholder="Minimum 8 caractères">
                </div>
              }
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="showForm.set(false)">Annuler</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveUser()">
              @if (saving()) { <span class="spinner-sm"></span> }
              {{ editingUser() ? 'Mettre à jour' : 'Créer' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Reset Password Modal -->
    @if (showResetPwd()) {
      <div class="modal-overlay" (click)="showResetPwd.set(false)">
        <div class="modal animate-pop-in" style="max-width:420px" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Réinitialiser le mot de passe</h3>
            <button class="modal-close" (click)="showResetPwd.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <p style="color:var(--text-muted);margin-bottom:16px">Définir un nouveau mot de passe pour <strong>{{ resetUser()?.name }}</strong></p>
            <div class="form-group">
              <label>Nouveau mot de passe</label>
              <input class="form-control" type="password" [(ngModel)]="newPassword" placeholder="Minimum 8 caractères">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="showResetPwd.set(false)">Annuler</button>
            <button class="btn btn-primary" [disabled]="!newPassword || saving()" (click)="confirmResetPassword()">
              Réinitialiser
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .admin-users { display: flex; flex-direction: column; gap: 20px; }
    .toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .search-wrap { display: flex; align-items: center; gap: 10px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 12px; padding: 0 14px; flex: 1; min-width: 200px; &:focus-within { border-color: var(--primary); } svg { color: var(--text-muted); flex-shrink: 0; } }
    .search-input { border: none; background: none; outline: none; padding: 12px 0; font-size: 14px; width: 100%; }
    .filter-select { padding: 12px 14px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--bg); font-size: 14px; font-weight: 600; cursor: pointer; }
    .user-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .user-stat-card { background: var(--bg); border-radius: 14px; padding: 16px; box-shadow: var(--shadow-sm); text-align: center; }
    .us-val { display: block; font-size: 28px; font-weight: 800; color: var(--primary); }
    .us-lbl { font-size: 12px; color: var(--text-muted); font-weight: 500; }

    .gamification-section { background: var(--bg); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-light); }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; h3 { font-size: 16px; font-weight: 700; margin: 0; } }
    .leaderboard { display: flex; flex-direction: column; gap: 8px; }
    .leaderboard-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-soft); border-radius: 12px; transition: all var(--transition); &:hover { transform: translateX(4px); } &.top-three { background: linear-gradient(135deg, var(--primary-50), var(--bg-soft)); border: 1px solid var(--primary-200); } }
    .rank { width: 28px; height: 28px; border-radius: 50%; background: var(--border); color: var(--text-muted); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; &.rank-1 { background: #FFD700; color: #fff; } &.rank-2 { background: #C0C0C0; color: #fff; } &.rank-3 { background: #CD7F32; color: #fff; } }
    .lb-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--primary-light)); color: #fff; font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .lb-info { flex: 1; min-width: 0; strong { display: block; font-size: 13px; font-weight: 700; } span { font-size: 11px; color: var(--text-muted); } }
    .lb-points { font-size: 14px; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 4px; }
    .table-wrap { background: var(--bg); border-radius: 16px; box-shadow: var(--shadow-sm); overflow: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; th { padding: 14px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-soft); border-bottom: 1px solid var(--border-light); white-space: nowrap; } td { padding: 12px 16px; border-bottom: 1px solid var(--border-light); vertical-align: middle; } tr:last-child td { border-bottom: none; } tr:hover td { background: var(--bg-soft); } }
    .user-avatar-sm { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--primary-light)); color: #fff; font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .mono { font-family: monospace; font-size: 12px; letter-spacing: 1px; }
    .date-cell { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
    .role-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; &.role-citizen { background: #DCFCE7; color: #166534; } &.role-collector { background: #DBEAFE; color: #1D4ED8; } &.role-admin_municipal { background: #FEF3C7; color: #92400E; } &.role-admin { background: #EDE9FE; color: #5B21B6; } }
    .status-pill { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; &.status-active { background: #DCFCE7; color: #166534; } &.status-offline { background: #FEF2F2; color: #991B1B; } }
    .action-btns { display: flex; gap: 4px; }
    .icon-action { width: 30px; height: 30px; border-radius: 8px; border: none; background: var(--bg-soft); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; &:hover { background: var(--primary-50); } &.danger:hover { background: #FEF2F2; } }
    .empty-row { text-align: center; padding: 40px; color: var(--text-muted); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 16px; font-size: 14px; color: var(--text-muted); }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal { background: var(--bg); border-radius: 20px; width: 100%; max-width: 560px; max-height: 90dvh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,0.2); }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border-light); h3 { font-size: 18px; font-weight: 700; } }
    .modal-close { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--bg-soft); cursor: pointer; font-size: 16px; }
    .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border-light); display: flex; gap: 12px; justify-content: flex-end; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .span-2 { grid-column: span 2; }
    .alert-error-sm { background: #FEF2F2; color: #DC2626; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 16px; }
    .spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
    @media (max-width: 768px) { .user-stats { grid-template-columns: repeat(2, 1fr); } .form-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }
  `]
})
export class AdminUsersComponent implements OnInit {
  users = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  showResetPwd = signal(false);
  editingUser = signal<any>(null);
  resetUser = signal<any>(null);
  formError = signal('');
  search = '';
  roleFilter = '';
  newPassword = '';
  page = signal(1);
  totalPages = signal(1);
  userStats = signal<any[]>([]);
  showLeaderboard = signal(false);
  leaderboard = signal<any[]>([]);

  form = { name: '', cni: '', phone: '', email: '', zone: 'Bastos', role: 'citizen', password: '' };
  zones = ['Bastos', 'Nlongkak', 'Melen', 'Essos', 'Mvog-Ada', 'Biyem-Assi', 'Mendong', 'Mimboman', 'Nsimeyong', 'Ekounou', 'Nkomo', 'Obili', 'Etoa-Meki', 'Messa', 'Damas'];

  constructor(private http: HttpClient) { }

  ngOnInit() { this.loadUsers(); }

  // Pagination methods
  prevPage() {
    if (this.page() > 1) {
      this.page.update(p => p - 1);
      this.loadUsers();
    }
  }

  nextPage() {
    if (this.page() < this.totalPages()) {
      this.page.update(p => p + 1);
      this.loadUsers();
    }
  }

  loadUsers() {
    this.loading.set(true);
    const params: any = { page: this.page(), limit: 20 };
    if (this.search) params.search = this.search;
    if (this.roleFilter) params.role = this.roleFilter;
    this.http.get(`${environment.apiUrl}/users`, { params }).subscribe({
      next: (res: any) => {
        this.users.set(res.data || []);
        this.totalPages.set(res.totalPages || 1);
        this.loading.set(false);
        this.updateStats(res);
      },
      error: () => this.loading.set(false)
    });
  }

  updateStats(res: any) {
    const data = res.data || [];
    this.userStats.set([
      { label: 'Total inscrits', value: res.total || data.length },
      { label: 'Actifs', value: data.filter((u: any) => u.isActive).length },
      { label: 'Citoyens', value: data.filter((u: any) => u.role === 'citizen').length },
      { label: 'Collecteurs', value: data.filter((u: any) => u.role === 'collector').length }
    ]);

    // Update leaderboard with top users by points
    this.leaderboard.set(
      data
        .filter((u: any) => u.isActive && u.role === 'citizen')
        .sort((a: any, b: any) => (b.points || 0) - (a.points || 0))
        .slice(0, 10)
    );
  }

  openForm(user: any) {
    this.editingUser.set(user);
    this.formError.set('');
    if (user) {
      this.form = { name: user.name, cni: user.cni || '', phone: user.phone, email: user.email, zone: user.zone, role: user.role, password: '' };
    } else {
      this.form = { name: '', cni: '', phone: '', email: '', zone: 'Bastos', role: 'citizen', password: '' };
    }
    this.showForm.set(true);
  }

  saveUser() {
    this.saving.set(true);
    this.formError.set('');
    const req = this.editingUser()
      ? this.http.put(`${environment.apiUrl}/users/${this.editingUser()._id}`, this.form)
      : this.http.post(`${environment.apiUrl}/users`, this.form);
    req.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.loadUsers(); },
      error: (err) => { this.saving.set(false); this.formError.set(err.error?.message || 'Erreur'); }
    });
  }

  toggleUserStatus(user: any) {
    const action = user.isActive ? 'suspend' : 'activate';
    if (user.isActive && !confirm(`Suspendre le compte de ${user.name} ?`)) return;
    this.http.patch(`${environment.apiUrl}/users/${user._id}/${action}`, {}).subscribe({
      next: () => this.loadUsers()
    });
  }

  resetPassword(user: any) {
    this.resetUser.set(user);
    this.newPassword = '';
    this.showResetPwd.set(true);
  }

  confirmResetPassword() {
    this.saving.set(true);
    this.http.patch(`${environment.apiUrl}/users/${this.resetUser()._id}/reset-password`, { newPassword: this.newPassword }).subscribe({
      next: () => { this.saving.set(false); this.showResetPwd.set(false); },
      error: () => this.saving.set(false)
    });
  }

  maskCNI(cni: string): string { return cni ? cni.substring(0, 4) + '***' + cni.slice(-2) : '—'; }
  maskPhone(phone: string): string { return phone ? phone.substring(0, 6) + '****' + phone.slice(-2) : '—'; }
  roleLabel(r: string): string { return { citizen: 'Citoyen', collector: 'Collecteur', admin_municipal: 'Adm. Mun.', admin: 'Admin', super_admin: 'Super Admin' }[r] || r; }
  roleBadge(r: string): string { return `role-${r}`; }
  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }
}