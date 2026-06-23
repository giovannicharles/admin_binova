import { Component, OnInit, AfterViewInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import L from 'leaflet';

@Component({
  selector: 'app-admin-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-map">
      <!-- Toolbar -->
      <div class="map-toolbar">
        <div class="filter-group">
          <select class="filter-select" [(ngModel)]="layerFilter" (change)="updateLayers()">
            <option value="all">Toutes les couches</option>
            <option value="bins">Bacs uniquement</option>
            <option value="reports">Signalements uniquement</option>
            <option value="tours">Tournées uniquement</option>
          </select>
          <select class="filter-select" [(ngModel)]="zoneFilter" (change)="filterByZone()">
            <option value="">Toutes zones</option>
            @for (z of zones; track z) { <option [value]="z">{{ z }}</option> }
          </select>
          <select class="filter-select" [(ngModel)]="statusFilter" (change)="filterByStatus()">
            <option value="">Tous statuts</option>
            <option value="active">Actif</option>
            <option value="full">Plein</option>
            <option value="offline">Hors ligne</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div class="legend">
          <div class="legend-item"><span class="legend-dot" style="background: #22C55E"></span> Actif</div>
          <div class="legend-item"><span class="legend-dot" style="background: #F59E0B"></span> Plein</div>
          <div class="legend-item"><span class="legend-dot" style="background: #EF4444"></span> Critique</div>
          <div class="legend-item"><span class="legend-dot" style="background: #64748B"></span> Hors ligne</div>
        </div>
      </div>

      <!-- Map Container -->
      <div class="map-container" #mapContainer></div>

      <!-- Stats Panel -->
      <div class="map-stats-panel">
        <h4>Vue actuelle</h4>
        <div class="stat-row">
          <span class="stat-label">Bacs visibles:</span>
          <span class="stat-value">{{ visibleBins() }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Signalements:</span>
          <span class="stat-value">{{ visibleReports() }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Tournées actives:</span>
          <span class="stat-value">{{ visibleTours() }}</span>
        </div>
      </div>

      <!-- Detail Panel -->
      @if (selectedItem()) {
        <div class="map-detail-panel animate-slide-in">
          <button class="close-btn" (click)="selectedItem.set(null)">✕</button>
          <div class="detail-content">
            @if (selectedItem().type === 'bin') {
              <div class="bin-detail">
                <div class="detail-header">
                  <span class="detail-icon" style="background: var(--primary-50)">
                    <i class="ri-delete-bin-line" style="color: var(--primary); font-size: 20px;"></i>
                  </span>
                  <div>
                    <h3>{{ selectedItem().data.binId }}</h3>
                    <p>{{ selectedItem().data.address }}</p>
                  </div>
                </div>
                <div class="detail-metrics">
                  <div class="metric">
                    <span class="metric-label">Remplissage</span>
                    <span class="metric-value" [style.color]="fillColor(selectedItem().data.fillLevel)">
                      {{ selectedItem().data.fillLevel }}%
                    </span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Batterie</span>
                    <span class="metric-value">{{ selectedItem().data.battery }}%</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Statut</span>
                    <span class="metric-value">{{ statusLabel(selectedItem().data.status) }}</span>
                  </div>
                </div>
                <div class="detail-actions">
                  <button class="btn btn-outline btn-sm" (click)="viewHistory(selectedItem().data)">
                    <i class="ri-bar-chart-box-line"></i> Historique
                  </button>
                  <button class="btn btn-outline btn-sm" (click)="markEmptied(selectedItem().data._id)">
                    <i class="ri-delete-bin-line"></i> Vider
                  </button>
                </div>
              </div>
            } @else if (selectedItem().type === 'report') {
              <div class="report-detail">
                <div class="detail-header">
                  <span class="detail-icon" style="background: var(--warning-soft)">
                    <i class="ri-alert-line" style="color: var(--warning); font-size: 20px;"></i>
                  </span>
                  <div>
                    <h3>{{ selectedItem().data.reportId }}</h3>
                    <p>{{ selectedItem().data.title }}</p>
                  </div>
                </div>
                <p class="detail-desc">{{ selectedItem().data.description }}</p>
                <div class="detail-tags">
                  <span class="badge" [class]="priorityClass(selectedItem().data.priority)">
                    {{ priorityLabel(selectedItem().data.priority) }}
                  </span>
                  <span class="badge badge-gray">{{ selectedItem().data.zone }}</span>
                </div>
                <div class="detail-actions">
                  <button class="btn btn-primary btn-sm" (click)="assignReport(selectedItem().data._id)">
                    <i class="ri-user-line"></i> Assigner
                  </button>
                </div>
              </div>
            } @else if (selectedItem().type === 'tour') {
              <div class="tour-detail">
                <div class="detail-header">
                  <span class="detail-icon" style="background: var(--accent-soft)">
                    <i class="ri-truck-line" style="color: var(--accent); font-size: 20px;"></i>
                  </span>
                  <div>
                    <h3>{{ selectedItem().data.name }}</h3>
                    <p>{{ selectedItem().data.zone }}</p>
                  </div>
                </div>
                <div class="detail-metrics">
                  <div class="metric">
                    <span class="metric-label">Progression</span>
                    <span class="metric-value">{{ tourProgress(selectedItem().data) }}%</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Bacs</span>
                    <span class="metric-value">{{ selectedItem().data.bins?.length || 0 }}</span>
                  </div>
                </div>
                <div class="detail-actions">
                  @if (selectedItem().data.status === 'scheduled') {
                    <button class="btn btn-primary btn-sm" (click)="startTour(selectedItem().data._id)">
                      <i class="ri-play-line"></i> Démarrer
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-map { position: relative; height: calc(100vh - 120px); display: flex; flex-direction: column; }
    
    .map-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; background: var(--bg); border-bottom: 1px solid var(--border-light);
      gap: 12px; flex-wrap: wrap;
    }
    
    .filter-group { display: flex; gap: 8px; flex-wrap: wrap; }
    
    .filter-select {
      padding: 8px 12px; border-radius: 8px; border: 1.5px solid var(--border);
      background: var(--bg); font-size: 13px; font-weight: 600; cursor: pointer;
    }
    
    .legend { display: flex; gap: 16px; flex-wrap: wrap; }
    
    .legend-item {
      display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-muted);
    }
    
    .legend-dot {
      width: 10px; height: 10px; border-radius: 50%;
    }
    
    .map-container {
      flex: 1; position: relative; z-index: 1;
    }
    
    .map-stats-panel {
      position: absolute; top: 16px; right: 16px; z-index: 1000;
      background: var(--bg); border-radius: 12px; padding: 16px;
      box-shadow: var(--shadow-lg); border: 1px solid var(--border-light);
      min-width: 180px;
    }
    
    .map-stats-panel h4 {
      font-size: 14px; font-weight: 700; margin: 0 0 12px 0;
    }
    
    .stat-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 0; border-bottom: 1px solid var(--border-light);
      
      &:last-child { border-bottom: none; }
    }
    
    .stat-label { font-size: 12px; color: var(--text-muted); }
    .stat-value { font-size: 14px; font-weight: 700; color: var(--primary); }
    
    .map-detail-panel {
      position: absolute; bottom: 16px; left: 16px; z-index: 1000;
      background: var(--bg); border-radius: 16px; padding: 20px;
      box-shadow: var(--shadow-xl); border: 1px solid var(--border-light);
      width: 320px; max-height: 400px; overflow-y: auto;
    }
    
    .close-btn {
      position: absolute; top: 12px; right: 12px;
      width: 28px; height: 28px; border-radius: 50%;
      border: none; background: var(--bg-soft); cursor: pointer;
      font-size: 14px; display: flex; align-items: center; justify-content: center;
    }
    
    .detail-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
    }
    
    .detail-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    
    .detail-header h3 {
      font-size: 16px; font-weight: 700; margin: 0;
    }
    
    .detail-header p {
      font-size: 13px; color: var(--text-muted); margin: 4px 0 0 0;
    }
    
    .detail-metrics {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;
    }
    
    .metric {
      text-align: center; padding: 12px; background: var(--bg-soft);
      border-radius: 10px;
    }
    
    .metric-label {
      display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;
    }
    
    .metric-value {
      font-size: 16px; font-weight: 700;
    }
    
    .detail-desc {
      font-size: 13px; color: var(--text-muted); line-height: 1.6;
      margin-bottom: 12px;
    }
    
    .detail-tags {
      display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;
    }
    
    .badge {
      padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
    }
    
    .badge-danger { background: #FEE2E2; color: #991B1B; }
    .badge-warning { background: #FEF3C7; color: #92400E; }
    .badge-info { background: #DBEAFE; color: #1D4ED8; }
    .badge-success { background: #DCFCE7; color: #166534; }
    .badge-gray { background: #F1F5F9; color: #64748B; }
    
    .detail-actions {
      display: flex; gap: 8px;
    }
    
    .btn {
      padding: 8px 14px; border-radius: 8px; border: none;
      font-size: 13px; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; gap: 6px; flex: 1;
      justify-content: center;
    }
    
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-outline { background: var(--bg-soft); color: var(--text); border: 1.5px solid var(--border); }
    .btn-sm { padding: 6px 12px; font-size: 12px; }
    
    @media (max-width: 768px) {
      .map-stats-panel { display: none; }
      .map-detail-panel { width: calc(100% - 32px); max-height: 50vh; }
    }
  `]
})
export class AdminMapComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  bins = signal<any[]>([]);
  reports = signal<any[]>([]);
  tours = signal<any[]>([]);
  loading = signal(true);
  
  layerFilter = 'all';
  zoneFilter = '';
  statusFilter = '';
  
  selectedItem = signal<any>(null);
  visibleBins = signal(0);
  visibleReports = signal(0);
  visibleTours = signal(0);
  
  private map: any;
  private markers: any[] = [];
  private binMarkers: any[] = [];
  private reportMarkers: any[] = [];
  private tourMarkers: any[] = [];
  
  zones = ['Bastos', 'Nlongkak', 'Melen', 'Essos', 'Mvog-Ada', 'Biyem-Assi', 'Mendong', 'Mimboman', 'Nsimeyong', 'Ekounou'];
  
  constructor(private http: HttpClient) {}
  
  ngOnInit() {
    this.loadData();
  }
  
  ngAfterViewInit() {
    this.initMap();
  }
  
  initMap() {
    // Yaoundé coordinates
    this.map = L.map(this.mapContainer.nativeElement).setView([3.8667, 11.5167], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    
    // Custom icons
    this.createCustomIcons();
  }
  
  createCustomIcons() {
    // Bin icons based on status
    // Report icons
    // Tour icons
  }
  
  loadData() {
    this.loading.set(true);
    
    // Load bins
    this.http.get(`${environment.apiUrl}/bins`, { params: { limit: 100 } }).subscribe({
      next: (res: any) => {
        this.bins.set(res.data || []);
        this.addBinMarkers();
        this.updateVisibleCounts();
      }
    });
    
    // Load reports
    this.http.get(`${environment.apiUrl}/reports`, { params: { limit: 50 } }).subscribe({
      next: (res: any) => {
        this.reports.set(res.data || []);
        this.addReportMarkers();
        this.updateVisibleCounts();
      }
    });
    
    // Load tours
    this.http.get(`${environment.apiUrl}/tours`).subscribe({
      next: (res: any) => {
        this.tours.set(res.data || []);
        this.addTourMarkers();
        this.updateVisibleCounts();
        this.loading.set(false);
      }
    });
  }
  
  addBinMarkers() {
    this.clearBinMarkers();
    
    this.bins().forEach(bin => {
      if (bin.location?.coordinates) {
        const lat = bin.location.coordinates[1];
        const lng = bin.location.coordinates[0];
        
        const color = this.getBinColor(bin);
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        
        const marker = L.marker([lat, lng], { icon })
          .addTo(this.map)
          .on('click', () => this.selectedItem.set({ type: 'bin', data: bin }));
        
        this.binMarkers.push(marker);
      }
    });
  }
  
  addReportMarkers() {
    this.clearReportMarkers();
    
    this.reports().forEach(report => {
      if (report.location?.coordinates) {
        const lat = report.location.coordinates[1];
        const lng = report.location.coordinates[0];
        
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:#F59E0B;width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><i style="color:#fff;font-size:14px">!</i></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        
        const marker = L.marker([lat, lng], { icon })
          .addTo(this.map)
          .on('click', () => this.selectedItem.set({ type: 'report', data: report }));
        
        this.reportMarkers.push(marker);
      }
    });
  }
  
  addTourMarkers() {
    this.clearTourMarkers();
    
    this.tours().forEach(tour => {
      if (tour.status === 'in_progress' && tour.bins?.length) {
        // Draw route for active tours
        const latlngs = tour.bins
          .filter((b: any) => b.bin?.location?.coordinates)
          .map((b: any) => [b.bin.location.coordinates[1], b.bin.location.coordinates[0]]);
        
        if (latlngs.length > 1) {
          const polyline = L.polyline(latlngs, {
            color: '#2C7A3E',
            weight: 4,
            opacity: 0.7
          }).addTo(this.map);
          
          this.tourMarkers.push(polyline);
        }
      }
    });
  }
  
  clearBinMarkers() {
    this.binMarkers.forEach(m => this.map.removeLayer(m));
    this.binMarkers = [];
  }
  
  clearReportMarkers() {
    this.reportMarkers.forEach(m => this.map.removeLayer(m));
    this.reportMarkers = [];
  }
  
  clearTourMarkers() {
    this.tourMarkers.forEach(m => this.map.removeLayer(m));
    this.tourMarkers = [];
  }
  
  updateLayers() {
    if (this.layerFilter === 'bins' || this.layerFilter === 'all') {
      this.binMarkers.forEach(m => m.addTo(this.map));
    } else {
      this.binMarkers.forEach(m => this.map.removeLayer(m));
    }
    
    if (this.layerFilter === 'reports' || this.layerFilter === 'all') {
      this.reportMarkers.forEach(m => m.addTo(this.map));
    } else {
      this.reportMarkers.forEach(m => this.map.removeLayer(m));
    }
    
    if (this.layerFilter === 'tours' || this.layerFilter === 'all') {
      this.tourMarkers.forEach(m => m.addTo(this.map));
    } else {
      this.tourMarkers.forEach(m => this.map.removeLayer(m));
    }
    
    this.updateVisibleCounts();
  }
  
  filterByZone() {
    this.addBinMarkers();
    this.addReportMarkers();
    this.updateVisibleCounts();
  }
  
  filterByStatus() {
    this.addBinMarkers();
    this.updateVisibleCounts();
  }
  
  updateVisibleCounts() {
    this.visibleBins.set(this.binMarkers.filter(m => this.map.hasLayer(m)).length);
    this.visibleReports.set(this.reportMarkers.filter(m => this.map.hasLayer(m)).length);
    this.visibleTours.set(this.tourMarkers.filter(m => this.map.hasLayer(m)).length);
  }
  
  getBinColor(bin: any): string {
    if (bin.status === 'offline') return '#64748B';
    if (bin.status === 'maintenance') return '#8B5CF6';
    if (bin.fillLevel >= 95) return '#EF4444';
    if (bin.fillLevel >= 80) return '#F59E0B';
    return '#22C55E';
  }
  
  fillColor(level: number): string {
    if (level >= 80) return 'var(--error)';
    if (level >= 50) return 'var(--warning)';
    return 'var(--primary)';
  }
  
  statusLabel(status: string): string {
    return { active: 'Actif', full: 'Plein', offline: 'Hors ligne', maintenance: 'Maintenance' }[status] || status;
  }
  
  priorityClass(priority: string): string {
    return { critical: 'badge-danger', high: 'badge-warning', medium: 'badge-info', low: 'badge-success' }[priority] || 'badge-gray';
  }
  
  priorityLabel(priority: string): string {
    return { critical: 'Critique', high: 'Urgent', medium: 'Normale', low: 'Faible' }[priority] || priority;
  }
  
  tourProgress(tour: any): number {
    if (!tour.bins?.length) return 0;
    return (tour.bins.filter((b: any) => b.collected).length / tour.bins.length) * 100;
  }
  
  viewHistory(bin: any) {
    // Navigate to bins history
    console.log('View history for bin:', bin._id);
  }
  
  markEmptied(id: string) {
    this.http.patch(`${environment.apiUrl}/bins/${id}/empty`, {}).subscribe({
      next: () => this.loadData()
    });
  }
  
  assignReport(id: string) {
    this.http.put(`${environment.apiUrl}/reports/${id}/status`, { status: 'assigned' }).subscribe({
      next: () => this.loadData()
    });
  }
  
  startTour(id: string) {
    this.http.put(`${environment.apiUrl}/tours/${id}`, { status: 'in_progress' }).subscribe({
      next: () => this.loadData()
    });
  }
}
