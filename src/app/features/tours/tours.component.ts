import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-tours',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-tours">
      <div class="toolbar">
        <select class="filter-select" [(ngModel)]="statusFilter" (change)="loadTours()">
          <option value="">Toutes</option>
          <option value="scheduled">Planifiées</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminées</option>
          <option value="cancelled">Annulées</option>
        </select>
        <button class="btn btn-primary" (click)="openForm()">+ Planifier tournée</button>
        <button class="btn btn-outline" style="border-color:var(--error);color:var(--error)" (click)="createEmergency()">
          <i class="ri-alarm-warning-line" style="font-size: 16px; margin-right: 6px;"></i>
          Tournée d'urgence
        </button>
      </div>

      @if (loading()) {
        <div style="display:flex;flex-direction:column;gap:12px">
          @for (s of [1,2,3]; track s) { <div class="shimmer" style="height:100px;border-radius:16px"></div> }
        </div>
      } @else {
        <div class="tours-list">
          @for (tour of tours(); track tour._id) {
            <div class="tour-card" [class]="'status-' + tour.status">
              <div class="tour-header">
                <div>
                  <h3>{{ tour.name }}</h3>
                  <p>{{ tour.zone }} · <i [class]="tourTypeIcon(tour.type)" style="font-size: 14px;"></i> {{ tourTypeLabel(tour.type) }}</p>
                </div>
                <span class="status-pill" [class]="tourStatusClass(tour.status)">{{ tourStatusLabel(tour.status) }}</span>
              </div>
              <div class="tour-progress">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="tourProgress(tour)"></div>
                </div>
                <span>{{ collectedCount(tour) }}/{{ totalBinsCount(tour) }} bacs vidés</span>
              </div>
              <div class="tour-footer">
                <span><i class="ri-calendar-line" style="font-size: 14px; margin-right: 4px;"></i> {{ formatDateTime(tour.scheduledDate) }}</span>
                <span><i class="ri-user-line" style="font-size: 14px; margin-right: 4px;"></i> {{ tour.collector?.name || 'Non assigné' }}</span>
                <span><i class="ri-map-pin-line" style="font-size: 14px; margin-right: 4px;"></i> {{ tour.estimatedDuration || '?' }} min</span>
              </div>
              <div class="tour-actions">
                @if (tour.status === 'scheduled') {
                  <button class="btn btn-outline btn-sm" (click)="startTour(tour._id)"><i class="ri-play-line" style="font-size: 14px; margin-right: 4px;"></i> Démarrer</button>
                }
                <button class="btn btn-outline btn-sm" (click)="deleteTour(tour._id)"><i class="ri-delete-bin-line" style="font-size: 14px; margin-right: 4px;"></i> Supprimer</button>
              </div>
            </div>
          } @empty {
            <div class="empty-state"><i class="ri-truck-line" style="font-size: 56px; display: block; margin-bottom: 16px;"></i><p>Aucune tournée planifiée</p></div>
          }
        </div>
      }
    </div>

    @if (showForm()) {
      <div class="modal-overlay" (click)="showForm.set(false)">
        <div class="modal animate-pop-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Planifier une tournée</h3>
            <button class="modal-close" (click)="showForm.set(false)"><i class="ri-close-line" style="font-size: 16px;"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nom de la tournée *</label>
              <input class="form-control" [(ngModel)]="form.name" placeholder="Tournée Bastos Lundi">
            </div>
            <div class="form-group">
              <label>Zone *</label>
              <select class="form-control" [(ngModel)]="form.zone" (change)="loadZoneBins()">
                @for (z of zones; track z) { <option [value]="z">{{ z }}</option> }
              </select>
            </div>
            <div class="form-group">
              <label>Date et heure *</label>
              <input class="form-control" type="datetime-local" [(ngModel)]="form.scheduledDate">
            </div>
            <div class="form-group">
              <label>Type</label>
              <select class="form-control" [(ngModel)]="form.type">
                <option value="scheduled">Standard planifiée</option>
                <option value="emergency">Urgence</option>
                <option value="manual">Manuelle</option>
              </select>
            </div>
            <div class="form-group">
              <label>Bacs à inclure ({{ form.selectedBins.length }} sélectionné(s))</label>
              <div class="bins-checklist">
                @for (bin of zoneBins(); track bin._id) {
                  <label class="check-item" [class.critical]="bin.fillLevel >= 95">
                    <input type="checkbox" [value]="bin._id" (change)="toggleBin(bin._id)">
                    <div class="check-info">
                      <span>{{ bin.binId }} — {{ bin.fillLevel }}%</span>
                      <span style="font-size:11px;color:var(--text-muted)">{{ bin.address }}</span>
                    </div>
                    <span class="fill-pill" [class]="fillClass(bin.fillLevel)">{{ bin.fillLevel }}%</span>
                  </label>
                }
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="showForm.set(false)">Annuler</button>
            <button class="btn btn-primary" [disabled]="saving() || !form.name || !form.scheduledDate" (click)="createTour()">
              @if (saving()) { <span class="spinner-sm"></span> } Planifier
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .admin-tours { display: flex; flex-direction: column; gap: 20px; }
    .toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .filter-select { padding: 12px 14px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--bg); font-size: 14px; font-weight: 600; cursor: pointer; }
    .tours-list { display: flex; flex-direction: column; gap: 14px; }
    .tour-card { background: var(--bg); border-radius: 16px; padding: 18px 20px; box-shadow: var(--shadow-sm); border-left: 4px solid var(--border); &.status-in_progress { border-left-color: var(--primary); } &.status-emergency { border-left-color: var(--error); } }
    .tour-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; h3 { font-size: 16px; font-weight: 700; } p { font-size: 13px; color: var(--text-muted); margin-top: 4px; } }
    .tour-progress { margin-bottom: 14px; display: flex; align-items: center; gap: 10px; .progress-bar { flex:1; height:6px; background:var(--border); border-radius:3px; overflow:hidden; } .progress-fill { height:100%; background:var(--primary); border-radius:3px; transition:width 0.5s; } span { font-size:12px; color:var(--text-muted); white-space:nowrap; } }
    .tour-footer { display: flex; gap: 16px; font-size: 12px; color: var(--text-muted); flex-wrap: wrap; margin-bottom: 12px; }
    .tour-actions { display: flex; gap: 8px; }
    .status-pill { padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700; }
    .status-scheduled { background:#FEF3C7;color:#92400E; }
    .status-in_progress { background:#DBEAFE;color:#1D4ED8; }
    .status-completed { background:#DCFCE7;color:#166534; }
    .status-cancelled { background:#F1F5F9;color:#64748B; }
    .bins-checklist { max-height: 240px; overflow-y: auto; border: 1px solid var(--border); border-radius: 12px; }
    .check-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--border-light); cursor: pointer; &:last-child { border-bottom: none; } &.critical { background: #FEF2F2; } input { accent-color: var(--primary); } }
    .check-info { flex: 1; display: flex; flex-direction: column; }
    .fill-pill { padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; &.fill-low { background: #DCFCE7; color: #166534; } &.fill-medium { background: #FEF3C7; color: #92400E; } &.fill-high { background: #FEE2E2; color: #991B1B; } }
    .empty-state { text-align:center;padding:60px 20px;span{font-size:56px;display:block;margin-bottom:16px}p{color:var(--text-muted)} }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal { background: var(--bg); border-radius: 20px; width: 100%; max-width: 560px; max-height: 90dvh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,0.2); }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border-light); h3 { font-size: 18px; font-weight: 700; } }
    .modal-close { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--bg-soft); cursor: pointer; font-size: 16px; }
    .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border-light); display: flex; gap: 12px; justify-content: flex-end; }
    .spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
  `]
})
export class AdminToursComponent implements OnInit {
  tours = signal<any[]>([]);
  zoneBins = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  statusFilter = '';

  form = { name: '', zone: 'Bastos', scheduledDate: '', type: 'scheduled', selectedBins: [] as string[] };
  zones = ['Bastos', 'Nlongkak', 'Melen', 'Essos', 'Mvog-Ada', 'Biyem-Assi', 'Mendong', 'Mimboman', 'Nsimeyong', 'Ekounou'];

  constructor(private http: HttpClient) { }

  ngOnInit() { this.loadTours(); }

  loadTours() {
    this.loading.set(true);
    const params: any = {};
    if (this.statusFilter) params.status = this.statusFilter;
    this.http.get(`${environment.apiUrl}/tours`, { params }).subscribe({
      next: (res: any) => { this.tours.set(res.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openForm() {
    this.form = { name: '', zone: 'Bastos', scheduledDate: '', type: 'scheduled', selectedBins: [] };
    this.showForm.set(true);
    this.loadZoneBins();
  }

  loadZoneBins() {
    this.http.get(`${environment.apiUrl}/bins`, { params: { zone: this.form.zone, limit: 50 } }).subscribe({
      next: (res: any) => this.zoneBins.set(res.data || [])
    });
  }

  toggleBin(id: string) {
    const idx = this.form.selectedBins.indexOf(id);
    if (idx === -1) this.form.selectedBins.push(id);
    else this.form.selectedBins.splice(idx, 1);
  }

  createTour() {
    this.saving.set(true);
    this.http.post(`${environment.apiUrl}/tours`, {
      ...this.form,
      bins: this.form.selectedBins.map(id => ({ bin: id }))
    }).subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.loadTours(); },
      error: () => this.saving.set(false)
    });
  }

  createEmergency() {
    const zone = prompt('Zone pour la tournée d\'urgence ?', 'Bastos');
    if (!zone) return;
    this.http.post(`${environment.apiUrl}/tours`, {
      name: `Urgence ${zone} - ${new Date().toLocaleDateString('fr-FR')}`,
      zone, type: 'emergency', scheduledDate: new Date().toISOString()
    }).subscribe({ next: () => this.loadTours() });
  }

  startTour(id: string) {
    this.http.put(`${environment.apiUrl}/tours/${id}`, { status: 'in_progress' }).subscribe({
      next: () => this.loadTours()
    });
  }

  deleteTour(id: string) {
    if (!confirm('Supprimer cette tournée ?')) return;
    this.http.delete(`${environment.apiUrl}/tours/${id}`).subscribe({ next: () => this.loadTours() });
  }

  // Méthodes utilitaires pour le template
  collectedCount(tour: any): number {
    return tour.bins?.filter((b: any) => b.collected).length || 0;
  }

  totalBinsCount(tour: any): number {
    return tour.bins?.length || 0;
  }

  tourProgress(tour: any): number {
    if (!tour.bins?.length) return 0;
    return (tour.bins.filter((b: any) => b.collected).length / tour.bins.length) * 100;
  }

  tourStatusClass(s: string): string { return `status-${s}`; }
  tourStatusLabel(s: string): string { return { scheduled: 'Planifiée', in_progress: 'En cours', completed: 'Terminée', cancelled: 'Annulée', emergency: 'Urgence' }[s] || s; }
  tourTypeIcon(type: string): string { return { emergency: 'ri-alarm-warning-line', scheduled: 'ri-truck-line', manual: 'ri-user-line' }[type] || 'ri-truck-line'; }
  tourTypeLabel(type: string): string { return { emergency: 'Urgence', scheduled: 'Standard', manual: 'Manuelle' }[type] || 'Standard'; }
  fillClass(n: number): string { return n >= 80 ? 'fill-high' : n >= 50 ? 'fill-medium' : 'fill-low'; }
  formatDateTime(d: string): string { return d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'; }
}