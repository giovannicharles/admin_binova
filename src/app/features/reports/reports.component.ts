import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-reports">
      <!-- View toggle -->
      <div class="toolbar">
        <div class="view-toggle">
          <button [class.active]="view() === 'kanban'" (click)="view.set('kanban')">
            <i class="ri-kanban-view-line"></i> Kanban
          </button>
          <button [class.active]="view() === 'table'" (click)="view.set('table')">
            <i class="ri-table-line"></i> Table
          </button>
        </div>
        <div class="filters">
          <select class="filter-select" [(ngModel)]="priorityFilter" (change)="loadReports()">
            <option value="">Toutes priorités</option>
            <option value="critical">Critique</option>
            <option value="high">Urgent</option>
            <option value="medium">Normale</option>
            <option value="low">Faible</option>
          </select>
          <select class="filter-select" [(ngModel)]="zoneFilter" (change)="loadReports()">
            <option value="">Toutes zones</option>
            @for (z of zones; track z) { <option [value]="z">{{ z }}</option> }
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="kanban-loading">
          @for (s of [1,2,3,4]; track s) { <div class="shimmer" style="height:300px;border-radius:16px"></div> }
        </div>
      } @else {

        <!-- KANBAN VIEW -->
        @if (view() === 'kanban') {
          <div class="kanban-board">
            @for (col of kanbanCols; track col.key) {
              <div class="kanban-col">
                <div class="kanban-col-header" [style.borderColor]="col.color">
                  <i [class]="col.icon" class="col-icon"></i>
                  <span>{{ col.label }}</span>
                  <span class="col-count">{{ getColReports(col.key).length }}</span>
                </div>
                <div class="kanban-cards">
                  @for (report of getColReports(col.key); track report._id) {
                    <div class="kanban-card" (click)="openDetail(report)">
                      <div class="card-top">
                        <span class="report-id">{{ report.reportId }}</span>
                        <span class="badge" [class]="priorityClass(report.priority)">{{ report.priority }}</span>
                      </div>
                      <h4>{{ report.title }}</h4>
                      <p class="card-desc">{{ report.description?.substring(0, 80) }}{{ report.description?.length > 80 ? '...' : '' }}</p>
                      <div class="card-footer">
                        <span class="card-zone"><i class="ri-map-pin-line" style="font-size: 14px; margin-right: 4px;"></i> {{ report.zone }}</span>
                        <span class="card-date">{{ formatDate(report.createdAt) }}</span>
                      </div>
                      @if (report.photos?.length) {
                        <div class="card-photos">
                          @for (p of report.photos.slice(0,2); track p) {
                            <img [src]="p" class="card-photo" alt="">
                          }
                        </div>
                      }
                    </div>
                  }
                  @if (getColReports(col.key).length === 0) {
                    <div class="empty-col">Aucun signalement</div>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- TABLE VIEW -->
        @if (view() === 'table') {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>ID</th><th>Titre</th><th>Zone</th><th>Catégorie</th><th>Priorité</th><th>Statut</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                @for (report of reports(); track report._id) {
                  <tr (click)="openDetail(report)" style="cursor:pointer">
                    <td class="mono">{{ report.reportId }}</td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ report.title }}</td>
                    <td>{{ report.zone }}</td>
                    <td>{{ categoryLabel(report.category) }}</td>
                    <td><span class="badge" [class]="priorityClass(report.priority)">{{ priorityLabel(report.priority) }}</span></td>
                    <td><span class="badge" [class]="statusBadge(report.status)">{{ statusLabel(report.status) }}</span></td>
                    <td class="date-cell">{{ formatDate(report.createdAt) }}</td>
                    <td (click)="$event.stopPropagation()">
                      <select class="inline-select" [value]="report.status" (change)="updateStatus(report._id, $event)">
                        <option value="pending">En attente</option>
                        <option value="assigned">Assigné</option>
                        <option value="in_progress">En cours</option>
                        <option value="resolved">Résolu</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>

    <!-- Detail Modal -->
    @if (selectedReport()) {
      <div class="modal-overlay" (click)="selectedReport.set(null)">
        <div class="modal animate-pop-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <span class="report-id-modal">{{ selectedReport().reportId }}</span>
              <h3>{{ selectedReport().title }}</h3>
            </div>
            <button class="modal-close" (click)="selectedReport.set(null)">
              <i class="ri-close-line"></i>
            </button>
          </div>
          <div class="modal-body">
            <p style="color:var(--text-muted);font-size:14px;line-height:1.7;margin-bottom:16px">{{ selectedReport().description }}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
              <span class="badge" [class]="priorityClass(selectedReport().priority)">{{ priorityLabel(selectedReport().priority) }}</span>
              <span class="badge" [class]="statusBadge(selectedReport().status)">{{ statusLabel(selectedReport().status) }}</span>
              <span class="badge badge-gray">
                <i class="ri-map-pin-line"></i> {{ selectedReport().zone }}
              </span>
            </div>
            @if (selectedReport().photos?.length) {
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
                @for (p of selectedReport().photos; track p) {
                  <img [src]="p" style="width:100px;height:100px;border-radius:10px;object-fit:cover" alt="">
                }
              </div>
            }
            <div class="form-group">
              <label>Mettre à jour le statut</label>
              <select class="form-control" [(ngModel)]="newStatus">
                <option value="pending">En attente</option>
                <option value="assigned">Assigné</option>
                <option value="in_progress">En cours</option>
                <option value="resolved">Résolu</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
            <div class="form-group">
              <label>Note interne</label>
              <textarea class="form-control" [(ngModel)]="statusNote" rows="3" placeholder="Note sur l'évolution..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="selectedReport.set(null)">Fermer</button>
            <button class="btn btn-primary" (click)="saveStatus()">Enregistrer</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .admin-reports { display: flex; flex-direction: column; gap: 20px; }
    .toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .view-toggle { display: flex; background: var(--bg); border-radius: 12px; border: 1.5px solid var(--border); overflow: hidden; button { padding: 10px 18px; border: none; background: none; font-size: 14px; font-weight: 600; color: var(--text-muted); cursor: pointer; &.active { background: var(--primary); color: #fff; } } }
    .filters { display: flex; gap: 8px; flex-wrap: wrap; }
    .filter-select { padding: 10px 14px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg); font-size: 13px; font-weight: 600; cursor: pointer; }
    .kanban-loading { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .kanban-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; overflow-x: auto; }
    .kanban-col { background: var(--bg-soft); border-radius: 16px; padding: 16px; min-width: 220px; }
    .kanban-col-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 3px solid; font-size: 14px; font-weight: 700; .col-icon { font-size: 18px; color: inherit; } .col-count { margin-left: auto; background: var(--bg); padding: 2px 10px; border-radius: 20px; font-size: 13px; } }
    .kanban-cards { display: flex; flex-direction: column; gap: 10px; }
    .kanban-card { background: var(--bg); border-radius: 12px; padding: 14px; box-shadow: var(--shadow-sm); cursor: pointer; transition: all 0.2s; &:hover { transform: translateY(-2px); box-shadow: var(--shadow); } }
    .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .report-id { font-size: 11px; font-family: monospace; color: var(--primary); font-weight: 700; }
    .kanban-card h4 { font-size: 13px; font-weight: 700; line-height: 1.4; margin-bottom: 6px; }
    .card-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-bottom: 10px; }
    .card-footer { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-light); }
    .card-photos { display: flex; gap: 6px; margin-top: 10px; }
    .card-photo { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; }
    .empty-col { text-align: center; color: var(--text-light); font-size: 13px; padding: 20px; border: 2px dashed var(--border); border-radius: 10px; }
    .table-wrap { background: var(--bg); border-radius: 16px; box-shadow: var(--shadow-sm); overflow: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-soft); border-bottom: 1px solid var(--border-light); } td { padding: 12px 16px; border-bottom: 1px solid var(--border-light); vertical-align: middle; } tr:last-child td { border-bottom: none; } tr:hover td { background: var(--bg-soft); } }
    .mono { font-family: monospace; font-size: 12px; font-weight: 700; color: var(--primary); }
    .date-cell { font-size: 12px; color: var(--text-muted); }
    .inline-select { padding: 6px 10px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--bg); font-size: 12px; cursor: pointer; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal { background: var(--bg); border-radius: 20px; width: 100%; max-width: 560px; max-height: 90dvh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,0.2); }
    .modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border-light); h3 { font-size: 17px; font-weight: 700; } }
    .report-id-modal { font-size: 12px; font-family: monospace; color: var(--primary); display: block; margin-bottom: 4px; }
    .modal-close { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--bg-soft); cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all var(--transition); }
    .modal-close:hover { background: var(--error-soft); color: var(--error); }
    .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border-light); display: flex; gap: 12px; justify-content: flex-end; }
    @media (max-width: 900px) { .kanban-board { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 600px) { .kanban-board { grid-template-columns: 1fr; } .kanban-loading { grid-template-columns: 1fr; } }
  `]
})
export class AdminReportsComponent implements OnInit {
  reports = signal<any[]>([]);
  loading = signal(true);
  view = signal<'kanban' | 'table'>('kanban');
  selectedReport = signal<any>(null);
  priorityFilter = '';
  zoneFilter = '';
  newStatus = 'pending';
  statusNote = '';

  kanbanCols = [
    { key: 'pending', label: 'En attente', icon: 'ri-time-line', color: '#F59E0B' },
    { key: 'assigned', label: 'Assigné', icon: 'ri-user-line', color: '#3B82F6' },
    { key: 'in_progress', label: 'En cours', icon: 'ri-tools-line', color: '#8B5CF6' },
    { key: 'resolved', label: 'Résolu', icon: 'ri-check-line', color: '#22C55E' }
  ];

  zones = ['Bastos', 'Nlongkak', 'Melen', 'Essos', 'Mvog-Ada', 'Biyem-Assi', 'Mendong', 'Mimboman', 'Nsimeyong', 'Ekounou'];

  constructor(private http: HttpClient) { }

  ngOnInit() { this.loadReports(); }

  loadReports() {
    this.loading.set(true);
    const params: any = { limit: 100 };
    if (this.priorityFilter) params.priority = this.priorityFilter;
    if (this.zoneFilter) params.zone = this.zoneFilter;
    this.http.get(`${environment.apiUrl}/reports`, { params }).subscribe({
      next: (res: any) => { this.reports.set(res.data || []); this.loading.set(false); },
      error: () => {
        // Use mock data if backend is not connected
        this.reports.set([
          { _id: '1', reportId: 'REP-001', priority: 'critical', zone: 'Bastos', status: 'pending', description: 'Bac plein depuis 3 jours', createdAt: new Date() },
          { _id: '2', reportId: 'REP-002', priority: 'high', zone: 'Melen', status: 'in_progress', description: 'Débordement signalé', createdAt: new Date() },
          { _id: '3', reportId: 'REP-003', priority: 'medium', zone: 'Essos', status: 'pending', description: 'Bac endommagé', createdAt: new Date() },
          { _id: '4', reportId: 'REP-004', priority: 'low', zone: 'Nlongkak', status: 'resolved', description: 'Nettoyage demandé', createdAt: new Date() },
          { _id: '5', reportId: 'REP-005', priority: 'critical', zone: 'Biyem-Assi', status: 'assigned', description: 'Bac manquant', createdAt: new Date() }
        ]);
        this.loading.set(false);
      }
    });
  }

  getColReports(status: string): any[] {
    return this.reports().filter(r => r.status === status);
  }

  openDetail(report: any) {
    this.selectedReport.set(report);
    this.newStatus = report.status;
    this.statusNote = '';
  }

  updateStatus(id: string, event: Event) {
    const status = (event.target as HTMLSelectElement).value;
    this.http.put(`${environment.apiUrl}/reports/${id}/status`, { status }).subscribe({
      next: () => this.loadReports()
    });
  }

  saveStatus() {
    const r = this.selectedReport();
    if (!r) return;
    this.http.put(`${environment.apiUrl}/reports/${r._id}/status`, { status: this.newStatus, note: this.statusNote }).subscribe({
      next: () => { this.selectedReport.set(null); this.loadReports(); }
    });
  }

  priorityClass(p: string): string { return { critical: 'badge-danger', high: 'badge-warning', medium: 'badge-info', low: 'badge-success' }[p] || 'badge-gray'; }
  priorityLabel(p: string): string { return { critical: 'Critique', high: 'Urgent', medium: 'Normale', low: 'Faible' }[p] || p; }
  statusBadge(s: string): string { return { pending: 'badge-warning', assigned: 'badge-info', in_progress: 'badge-info', resolved: 'badge-success', cancelled: 'badge-gray' }[s] || 'badge-gray'; }
  statusLabel(s: string): string { return { pending: 'En attente', assigned: 'Assigné', in_progress: 'En cours', resolved: 'Résolu', cancelled: 'Annulé' }[s] || s; }
  categoryLabel(c: string): string { return { overflow: 'Débordement', damage: 'Dégradation', illegal_dump: 'Dépôt sauvage', odor: 'Odeur', pest: 'Nuisibles', other: 'Autre' }[c] || c; }
  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }
}
