import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-bins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-bins">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-wrap">
          <i class="ri-search-line" style="font-size: 18px; color: var(--text-muted);"></i>
          <input class="search-input" type="text" [(ngModel)]="search" (input)="loadBins()"
                 placeholder="Rechercher par ID, zone...">
        </div>
        <select class="filter-select" [(ngModel)]="statusFilter" (change)="loadBins()">
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="full">Plein</option>
          <option value="offline">Hors ligne</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <button class="btn btn-primary" (click)="openForm(null)">
          <i class="ri-add-line" style="font-size: 16px; margin-right: 6px;"></i> Ajouter bac
        </button>
      </div>

      <!-- Bins table -->
      @if (loading()) {
        <div class="table-loading">
          @for (s of [1,2,3,4,5]; track s) {
            <div class="shimmer row-shimmer"></div>
          }
        </div>
      } @else {
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Zone</th><th>Adresse</th>
                <th>Niveau</th><th>Statut</th><th>Batterie</th>
                <th>Dernière activité</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (bin of bins(); track bin._id) {
                <tr>
                  <td class="mono">{{ bin.binId }}</td>
                  <td>{{ bin.zone }}</td>
                  <td class="address-cell">{{ bin.address }}</td>
                  <td>
                    <div class="fill-cell">
                      <div class="fill-mini">
                        <div class="fill-mini-bar" [class]="fillClass(bin.fillLevel)" [style.width.%]="bin.fillLevel"></div>
                      </div>
                      <span [style.color]="fillColor(bin.fillLevel)" style="font-weight:700;font-size:13px">{{ bin.fillLevel }}%</span>
                    </div>
                  </td>
                  <td>
                    <span class="status-pill" [class]="statusClass(bin.status)">
                      <i [class]="statusDot(bin.status)" style="font-size: 14px; margin-right: 4px;"></i> {{ statusLabel(bin.status) }}
                    </span>
                  </td>
                  <td>
                    <span [style.color]="bin.battery < 20 ? 'var(--error)' : 'var(--text)'">
                      <i class="ri-battery-line" style="font-size: 14px; margin-right: 4px;"></i> {{ bin.battery }}%
                    </span>
                  </td>
                  <td class="date-cell">{{ formatDate(bin.lastReading) }}</td>
                  <td>
                    <div class="action-btns">
                      <button class="icon-action" title="Historique" (click)="openHistory(bin)">
                        <i class="ri-bar-chart-box-line" style="font-size: 16px;"></i>
                      </button>
                      <button class="icon-action" title="Vider" (click)="markEmptied(bin._id)">
                        <i class="ri-delete-bin-line" style="font-size: 16px;"></i>
                      </button>
                      <button class="icon-action" title="Modifier" (click)="openForm(bin)">
                        <i class="ri-edit-line" style="font-size: 16px;"></i>
                      </button>
                      <button class="icon-action danger" title="Supprimer" (click)="deleteBin(bin._id)">
                        <i class="ri-delete-bin-2-line" style="font-size: 16px;"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="empty-row">Aucun bac trouvé</td></tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination">
          <button class="btn btn-outline btn-sm" [disabled]="page() <= 1" (click)="prevPage()">← Précédent</button>
          <span>Page {{ page() }} / {{ totalPages() }}</span>
          <button class="btn btn-outline btn-sm" [disabled]="page() >= totalPages()" (click)="nextPage()">Suivant →</button>
        </div>
      }
    </div>

    <!-- Bin Form Modal -->
    @if (showForm()) {
      <div class="modal-overlay" (click)="showForm.set(false)">
        <div class="modal animate-pop-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingBin() ? 'Modifier le bac' : 'Nouveau bac' }}</h3>
            <button class="modal-close" (click)="showForm.set(false)">✕</button>
          </div>
          <div class="modal-body">
            @if (formError()) { <div class="alert-error-sm">{{ formError() }}</div> }
            <div class="form-grid">
              <div class="form-group">
                <label>Identifiant bac</label>
                <input class="form-control" [(ngModel)]="form.binId" placeholder="BIN-XXXXX" style="text-transform:uppercase">
              </div>
              <div class="form-group">
                <label>Zone</label>
                <select class="form-control" [(ngModel)]="form.zone">
                  @for (z of zones; track z) { <option [value]="z">{{ z }}</option> }
                </select>
              </div>
              <div class="form-group span-2">
                <label>Adresse</label>
                <input class="form-control" [(ngModel)]="form.address" placeholder="Rue, quartier...">
              </div>
              <div class="form-group">
                <label>Latitude</label>
                <input class="form-control" type="number" [(ngModel)]="form.latitude" step="0.0001" placeholder="3.8667">
              </div>
              <div class="form-group">
                <label>Longitude</label>
                <input class="form-control" type="number" [(ngModel)]="form.longitude" step="0.0001" placeholder="11.5167">
              </div>
              <div class="form-group">
                <label>Type de déchets</label>
                <select class="form-control" [(ngModel)]="form.wasteType">
                  <option value="mixed">Mixte</option>
                  <option value="organic">Organique</option>
                  <option value="recyclable">Recyclable</option>
                  <option value="hazardous">Dangereux</option>
                </select>
              </div>
              <div class="form-group">
                <label>Capacité (litres)</label>
                <input class="form-control" type="number" [(ngModel)]="form.capacity" placeholder="240">
              </div>
              <div class="form-group">
                <label>Seuil attention (%)</label>
                <input class="form-control" type="number" [(ngModel)]="form.thresholdAttention" placeholder="80" min="50" max="100">
              </div>
              <div class="form-group">
                <label>Seuil critique (%)</label>
                <input class="form-control" type="number" [(ngModel)]="form.thresholdCritical" placeholder="95" min="80" max="100">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="showForm.set(false)">Annuler</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveBin()">
              @if (saving()) { <span class="spinner-sm"></span> }
              {{ editingBin() ? 'Mettre à jour' : 'Créer le bac' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- History Modal -->
    @if (showHistory()) {
      <div class="modal-overlay" (click)="showHistory.set(false)">
        <div class="modal modal-lg animate-pop-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Historique · {{ historyBin()?.binId }}</h3>
            <button class="modal-close" (click)="showHistory.set(false)">✕</button>
          </div>
          <div class="modal-body">
            @if (historyData().length > 0) {
              <!-- Mini chart -->
              <div class="history-chart">
                @for (pt of historyData().slice(-20); track pt.timestamp) {
                  <div class="history-bar-wrap">
                    <div class="history-bar" [class]="fillClass(pt.fillLevel)" [style.height.%]="pt.fillLevel"></div>
                    <span class="history-label">{{ formatHour(pt.timestamp) }}</span>
                  </div>
                }
              </div>
              <div class="history-table-wrap">
                <table class="data-table">
                  <thead><tr><th>Date/Heure</th><th>Niveau</th><th>Batterie</th><th>Statut</th></tr></thead>
                  <tbody>
                    @for (pt of historyData().slice(0, 50); track pt.timestamp) {
                      <tr>
                        <td class="mono">{{ formatDateTime(pt.timestamp) }}</td>
                        <td>
                          <span [style.color]="fillColor(pt.fillLevel)" style="font-weight:700">{{ pt.fillLevel }}%</span>
                        </td>
                        <td><i class="ri-battery-line" style="font-size: 14px; margin-right: 4px;"></i> {{ pt.battery }}%</td>
                        <td><span class="status-pill" [class]="statusClass(pt.status)">{{ statusLabel(pt.status) }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-row" style="padding:40px;text-align:center">Aucune donnée historique disponible</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .admin-bins { display: flex; flex-direction: column; gap: 20px; }

    .toolbar {
      display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
    }

    .search-wrap {
      display: flex; align-items: center; gap: 10px;
      background: var(--bg); border: 1.5px solid var(--border);
      border-radius: 12px; padding: 0 14px; flex: 1; min-width: 200px;
      &:focus-within { border-color: var(--primary); }
      svg { color: var(--text-muted); flex-shrink: 0; }
    }

    .search-input {
      border: none; background: none; outline: none;
      padding: 12px 0; font-size: 14px; width: 100%;
    }

    .filter-select {
      padding: 12px 16px; border-radius: 12px;
      border: 1.5px solid var(--border); background: var(--bg);
      font-size: 14px; font-weight: 600; color: var(--text); cursor: pointer;
    }

    .table-loading { display: flex; flex-direction: column; gap: 8px; }
    .row-shimmer { height: 52px; border-radius: 8px; }

    .table-wrap { background: var(--bg); border-radius: 16px; box-shadow: var(--shadow-sm); overflow: auto; }

    .data-table {
      width: 100%; border-collapse: collapse; font-size: 13px;
      th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-soft); border-bottom: 1px solid var(--border-light); white-space: nowrap; }
      td { padding: 14px 16px; border-bottom: 1px solid var(--border-light); vertical-align: middle; }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: var(--bg-soft); }
    }

    .mono { font-family: monospace; font-size: 12px; font-weight: 600; color: var(--primary); }
    .address-cell { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .date-cell { font-size: 12px; color: var(--text-muted); white-space: nowrap; }

    .fill-cell { display: flex; align-items: center; gap: 8px; min-width: 100px; }
    .fill-mini { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .fill-mini-bar { height: 100%; border-radius: 3px; transition: width 0.5s; &.fill-low{background:var(--primary)} &.fill-medium{background:var(--warning)} &.fill-high{background:var(--error)} }

    .status-pill {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;
      &.status-active { background: #DCFCE7; color: #166534; }
      &.status-full { background: #FEE2E2; color: #991B1B; }
      &.status-offline { background: #F1F5F9; color: #64748B; }
      &.status-maintenance { background: #FEF3C7; color: #92400E; }
    }

    .action-btns { display: flex; gap: 4px; }
    .icon-action {
      width: 32px; height: 32px; border-radius: 8px;
      border: none; background: var(--bg-soft);
      cursor: pointer; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
      &:hover { background: var(--primary-50); }
      &.danger:hover { background: #FEF2F2; }
    }

    .empty-row { text-align: center; padding: 40px; color: var(--text-muted); }

    .pagination {
      display: flex; align-items: center; justify-content: center; gap: 16px;
      padding: 16px; font-size: 14px; color: var(--text-muted);
    }

    /* MODAL - Enhanced styling inspired by design reference */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      backdrop-filter: blur(8px); z-index: 500;
      display: flex; align-items: center; justify-content: center; padding: 20px;
      animation: fade-in 0.2s ease;
    }

    .modal {
      background: var(--bg); border-radius: 24px;
      width: 100%; max-width: 560px; max-height: 90dvh;
      overflow: hidden; display: flex; flex-direction: column;
      box-shadow: 0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05);
      animation: scale-in 0.3s ease;
      &.modal-lg { max-width: 760px; }
    }

    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 24px 28px; border-bottom: 1px solid var(--border-light);
      background: var(--bg-soft);
      h3 { font-size: 18px; font-weight: 700; color: var(--text); }
    }

    .modal-close {
      width: 36px; height: 36px; border-radius: 50%;
      border: none; background: var(--bg);
      cursor: pointer; font-size: 18px; color: var(--text-muted);
      display: flex; align-items: center; justify-content: center;
      transition: all var(--transition);
      &:hover { background: var(--error-soft); color: var(--error); transform: rotate(90deg); }
    }

    .modal-body { padding: 28px; overflow-y: auto; flex: 1; }
    .modal-footer { padding: 20px 28px; border-top: 1px solid var(--border-light); display: flex; gap: 12px; justify-content: flex-end; background: var(--bg-soft); }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .span-2 { grid-column: span 2; }

    .alert-error-sm { background: #FEF2F2; color: #DC2626; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 16px; }

    .spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }

    .history-chart {
      display: flex; align-items: flex-end; gap: 4px; height: 120px;
      background: var(--bg-soft); border-radius: 12px; padding: 16px; margin-bottom: 16px;
    }
    .history-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 4px; }
    .history-bar { width: 100%; border-radius: 3px 3px 0 0; min-height: 3px; &.fill-low{background:var(--primary)} &.fill-medium{background:var(--warning)} &.fill-high{background:var(--error)} }
    .history-label { font-size: 9px; color: var(--text-muted); }
    .history-table-wrap { max-height: 300px; overflow-y: auto; border-radius: 12px; border: 1px solid var(--border-light); }

    @media (max-width: 600px) {
      .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
    }
  `]
})
export class AdminBinsComponent implements OnInit {
  bins = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  showHistory = signal(false);
  editingBin = signal<any>(null);
  historyBin = signal<any>(null);
  historyData = signal<any[]>([]);
  formError = signal('');
  search = '';
  statusFilter = '';
  page = signal(1);
  totalPages = signal(1);

  form = {
    binId: '', zone: 'Bastos', address: '', latitude: 3.8667, longitude: 11.5167,
    wasteType: 'mixed', capacity: 240, thresholdAttention: 80, thresholdCritical: 95
  };

  zones = ['Bastos', 'Nlongkak', 'Melen', 'Essos', 'Mvog-Ada', 'Biyem-Assi', 'Mendong', 'Mimboman', 'Nsimeyong', 'Ekounou', 'Nkomo', 'Obili', 'Etoa-Meki', 'Messa', 'Damas'];

  constructor(private http: HttpClient) { }

  ngOnInit() { this.loadBins(); }

  // Pagination methods
  prevPage() {
    if (this.page() > 1) {
      this.page.update(p => p - 1);
      this.loadBins();
    }
  }

  nextPage() {
    if (this.page() < this.totalPages()) {
      this.page.update(p => p + 1);
      this.loadBins();
    }
  }

  loadBins() {
    this.loading.set(true);
    const params: any = { page: this.page(), limit: 20 };
    if (this.search) params.search = this.search;
    if (this.statusFilter) params.status = this.statusFilter;

    this.http.get(`${environment.apiUrl}/bins`, { params }).subscribe({
      next: (res: any) => {
        this.bins.set(res.data || []);
        this.totalPages.set(res.totalPages || 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openForm(bin: any) {
    this.editingBin.set(bin);
    this.formError.set('');
    if (bin) {
      this.form = {
        binId: bin.binId, zone: bin.zone, address: bin.address,
        latitude: bin.location?.coordinates[1] || 3.8667,
        longitude: bin.location?.coordinates[0] || 11.5167,
        wasteType: bin.wasteType, capacity: bin.capacity,
        thresholdAttention: bin.alertThresholds?.attention || 80,
        thresholdCritical: bin.alertThresholds?.critical || 95
      };
    } else {
      this.form = { binId: '', zone: 'Bastos', address: '', latitude: 3.8667, longitude: 11.5167, wasteType: 'mixed', capacity: 240, thresholdAttention: 80, thresholdCritical: 95 };
    }
    this.showForm.set(true);
  }

  saveBin() {
    this.saving.set(true);
    this.formError.set('');
    const payload = {
      ...this.form,
      location: { type: 'Point', coordinates: [this.form.longitude, this.form.latitude] },
      alertThresholds: { attention: this.form.thresholdAttention, critical: this.form.thresholdCritical }
    };

    const req = this.editingBin()
      ? this.http.put(`${environment.apiUrl}/bins/${this.editingBin()._id}`, payload)
      : this.http.post(`${environment.apiUrl}/bins`, payload);

    req.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.loadBins(); },
      error: (err) => { this.saving.set(false); this.formError.set(err.error?.message || 'Erreur'); }
    });
  }

  deleteBin(id: string) {
    if (!confirm('Supprimer ce bac ?')) return;
    this.http.delete(`${environment.apiUrl}/bins/${id}`).subscribe({
      next: () => this.loadBins()
    });
  }

  markEmptied(id: string) {
    this.http.patch(`${environment.apiUrl}/bins/${id}/empty`, {}).subscribe({
      next: () => this.loadBins()
    });
  }

  openHistory(bin: any) {
    this.historyBin.set(bin);
    this.historyData.set([]);
    this.showHistory.set(true);
    this.http.get(`${environment.apiUrl}/bins/${bin._id}/history`, { params: { days: '7' } }).subscribe({
      next: (res: any) => this.historyData.set(res.data || [])
    });
  }

  fillClass(n: number): string { return n >= 80 ? 'fill-high' : n >= 50 ? 'fill-medium' : 'fill-low'; }
  fillColor(n: number): string { return n >= 80 ? 'var(--error)' : n >= 50 ? 'var(--warning)' : 'var(--primary)'; }
  statusClass(s: string): string { return `status-${s}`; }
  statusLabel(s: string): string { return { active: 'Actif', full: 'Plein', offline: 'Hors ligne', maintenance: 'Maintenance' }[s] || s; }
  statusDot(s: string): string { return { active: 'ri-checkbox-circle-line', full: 'ri-close-circle-line', offline: 'ri-checkbox-blank-circle-line', maintenance: 'ri-error-warning-line' }[s] || 'ri-checkbox-blank-circle-line'; }
  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }
  formatDateTime(d: string): string { return d ? new Date(d).toLocaleString('fr-FR') : '—'; }
  formatHour(d: string): string { return d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''; }
}