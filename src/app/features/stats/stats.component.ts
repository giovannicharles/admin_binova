import { Component, OnInit, signal, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// ========== STATS COMPONENT ==========
@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-stats">
      <div class="stats-toolbar">
        <h2 style="font-size:18px">Statistiques & Exports</h2>
        <div style="display:flex;gap:10px">
          <button class="btn btn-outline" (click)="exportCSV()"><i class="ri-table-line" style="font-size: 14px; margin-right: 6px;"></i> Export CSV</button>
          <button class="btn btn-primary" (click)="exportPDF()"><i class="ri-file-pdf-line" style="font-size: 14px; margin-right: 6px;"></i> Export PDF</button>
        </div>
      </div>

      <!-- KPI row -->
      <div class="stats-grid">
        @for (kpi of kpis(); track kpi.label) {
          <div class="stat-big-card">
            <i [class]="kpi.icon" class="stat-icon"></i>
            <div class="stat-num">{{ kpi.value }}</div>
            <div class="stat-label">{{ kpi.label }}</div>
            @if (kpi.trend) {
              <div class="stat-trend" [class.up]="kpi.trendUp" [class.down]="!kpi.trendUp">
                {{ kpi.trendUp ? '↑' : '↓' }} {{ kpi.trend }}
              </div>
            }
          </div>
        }
      </div>

      <!-- Fill trend chart -->
      <div class="chart-section">
        <div class="section-header">
          <h3>Évolution remplissage — 7 jours</h3>
          <div class="chart-controls">
            <button class="chart-btn" [class.active]="chartPeriod() === '7d'" (click)="chartPeriod.set('7d')">7J</button>
            <button class="chart-btn" [class.active]="chartPeriod() === '30d'" (click)="chartPeriod.set('30d')">30J</button>
            <button class="chart-btn" [class.active]="chartPeriod() === '90d'" (click)="chartPeriod.set('90d')">90J</button>
          </div>
        </div>
        <div class="chart-container">
          <canvas #fillTrendChart></canvas>
        </div>
      </div>

      <!-- Reports by category pie chart -->
      <div class="chart-section">
        <div class="section-header">
          <h3>Signalements par catégorie</h3>
          <button class="chart-btn" (click)="refreshCharts()">
            <i class="ri-refresh-line" style="font-size: 14px;"></i>
          </button>
        </div>
        <div class="chart-container">
          <canvas #categoryChart></canvas>
        </div>
      </div>

      <!-- Reports by zone -->
      <div class="chart-section">
        <div class="section-header"><h3>Signalements par zone</h3></div>
        <div class="zone-chart">
          @for (zone of opensByArea(); track zone._id) {
            <div class="zone-bar-row">
              <span class="zone-lbl">{{ zone._id }}</span>
              <div class="zone-bar-bg">
                <div class="zone-bar-inner" [style.width.%]="(zone.count / maxAreaCount()) * 100"></div>
              </div>
              <span class="zone-count">{{ zone.count }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-stats { display: flex; flex-direction: column; gap: 24px; }
    .stats-toolbar { display: flex; align-items: center; justify-content: space-between; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .stat-big-card { background: var(--bg); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow); text-align: center; border: 1px solid var(--border-light); transition: all var(--transition); }
    .stat-big-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
    .stat-icon { font-size: 32px; display: block; margin-bottom: 10px; color: var(--primary-600); }
    .stat-num { font-size: 36px; font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 4px; }
    .stat-label { font-size: 13px; color: var(--text-muted); font-weight: 600; }
    .stat-trend { font-size: 12px; font-weight: 700; margin-top: 8px; &.up { color: var(--success); } &.down { color: var(--error); } }
    .chart-section { background: var(--bg); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow); border: 1px solid var(--border-light); }
    .section-header { margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; h3 { font-size: 15px; font-weight: 700; } }
    .chart-controls { display: flex; gap: 8px; }
    .chart-btn { padding: 6px 12px; border: 1.5px solid var(--border); background: var(--bg); border-radius: 8px; font-size: 12px; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: all var(--transition); &.active { background: var(--primary); border-color: var(--primary); color: #fff; } &:hover:not(.active) { background: var(--bg-soft); } }
    .admin-chart { display: flex; align-items: flex-end; gap: 8px; height: 160px; }
    .chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 4px; }
    .chart-pct { font-size: 11px; font-weight: 700; color: var(--text-muted); }
    .chart-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
    .chart-bar-fill { width: 100%; border-radius: 4px 4px 0 0; transition: height 0.8s ease; &.fill-low{background:var(--primary)} &.fill-medium{background:var(--warning)} &.fill-high{background:var(--error)} }
    .chart-day { font-size: 11px; color: var(--text-muted); }
    .zone-chart { display: flex; flex-direction: column; gap: 12px; }
    .zone-bar-row { display: flex; align-items: center; gap: 12px; }
    .zone-lbl { font-size: 13px; font-weight: 600; width: 100px; color: var(--text-muted); flex-shrink: 0; }
    .zone-bar-bg { flex: 1; height: 12px; background: var(--border); border-radius: 6px; overflow: hidden; }
    .zone-bar-inner { height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary-light)); border-radius: 6px; transition: width 0.8s ease; }
    .zone-count { font-size: 13px; font-weight: 700; color: var(--primary); width: 32px; text-align: right; }
    .chart-container { position: relative; height: 250px; padding: 10px; }
    @media (max-width: 768px) { .stats-grid { grid-template-columns: 1fr 1fr; } }
  `]
})
export class AdminStatsComponent implements OnInit, AfterViewInit {
  kpis = signal<any[]>([]);
  fillTrend = signal<any[]>([]);
  opensByArea = signal<any[]>([]);
  maxAreaCount = signal(1);
  chartPeriod = signal('7d');

  @ViewChild('fillTrendChart') fillTrendChart!: ElementRef;
  @ViewChild('categoryChart') categoryChart!: ElementRef;

  private fillTrendChartInstance: any;
  private categoryChartInstance: any;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.http.get(`${environment.apiUrl}/stats/dashboard`).subscribe({
      next: (res: any) => {
        const d = res.data;
        this.kpis.set([
          { icon: 'ri-delete-bin-line', value: d?.bins?.total || 0, label: 'Bacs connectés', trend: '+3 ce mois', trendUp: true },
          { icon: 'ri-bar-chart-box-line', value: `${d?.bins?.avgFillLevel || 0}%`, label: 'Remplissage moyen' },
          { icon: 'ri-clipboard-line', value: d?.reports?.total || 0, label: 'Signalements totaux', trend: '+12 cette semaine', trendUp: true },
          { icon: 'ri-check-double-line', value: d?.reports?.resolved || 0, label: 'Signalements résolus' },
          { icon: 'ri-user-line', value: d?.users?.total || 0, label: 'Citoyens inscrits', trend: '+28 ce mois', trendUp: true },
          { icon: 'ri-star-line', value: d?.users?.avgPoints || 0, label: 'Points moyens' },
          { icon: 'ri-truck-line', value: d?.tours?.total || 0, label: 'Tournées planifiées' },
          { icon: 'ri-timer-line', value: `${d?.reports?.avgResolutionTime || 0}h`, label: 'Délai moyen résolution' }
        ]);
      },
      error: () => {
        // Use mock data if backend is not connected
        this.kpis.set([
          { icon: 'ri-delete-bin-line', value: 156, label: 'Bacs connectés', trend: '+3 ce mois', trendUp: true },
          { icon: 'ri-bar-chart-box-line', value: '67%', label: 'Remplissage moyen' },
          { icon: 'ri-clipboard-line', value: 42, label: 'Signalements totaux', trend: '+12 cette semaine', trendUp: true },
          { icon: 'ri-check-double-line', value: 38, label: 'Signalements résolus' },
          { icon: 'ri-user-line', value: 1247, label: 'Citoyens inscrits', trend: '+28 ce mois', trendUp: true },
          { icon: 'ri-star-line', value: 245, label: 'Points moyens' },
          { icon: 'ri-truck-line', value: 18, label: 'Tournées planifiées' },
          { icon: 'ri-timer-line', value: '4.2h', label: 'Délai moyen résolution' }
        ]);
      }
    });
    this.http.get(`${environment.apiUrl}/stats/fill-trend`).subscribe({
      next: (res: any) => this.fillTrend.set(res.data || []),
      error: () => {
        // Mock data for fill trend
        this.fillTrend.set([
          { date: '2024-05-24', avgFill: 65 },
          { date: '2024-05-25', avgFill: 72 },
          { date: '2024-05-26', avgFill: 58 },
          { date: '2024-05-27', avgFill: 81 },
          { date: '2024-05-28', avgFill: 74 },
          { date: '2024-05-29', avgFill: 69 },
          { date: '2024-05-30', avgFill: 77 }
        ]);
      }
    });
    this.http.get(`${environment.apiUrl}/stats/opens-by-area`).subscribe({
      next: (res: any) => {
        const data = res.data || [];
        this.opensByArea.set(data);
        this.maxAreaCount.set(Math.max(...data.map((d: any) => d.count), 1));
      },
      error: () => {
        // Mock data for opens by area
        const mockData = [
          { _id: 'Bastos', count: 12 },
          { _id: 'Nlongkak', count: 8 },
          { _id: 'Melen', count: 15 },
          { _id: 'Essos', count: 6 },
          { _id: 'Mvog-Ada', count: 9 },
          { _id: 'Biyem-Assi', count: 11 },
          { _id: 'Mendong', count: 7 },
          { _id: 'Mimboman', count: 5 }
        ];
        this.opensByArea.set(mockData);
        this.maxAreaCount.set(Math.max(...mockData.map((d: any) => d.count), 1));
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => this.initCharts(), 100);
  }

  initCharts() {
    // Initialize fill trend chart
    if (this.fillTrendChart && this.fillTrend().length > 0) {
      const ctx = this.fillTrendChart.nativeElement.getContext('2d');
      this.fillTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.fillTrend().map(p => this.formatDay(p.date)),
          datasets: [{
            label: 'Remplissage moyen (%)',
            data: this.fillTrend().map(p => p.avgFill),
            borderColor: '#2C7A3E',
            backgroundColor: 'rgba(44, 122, 62, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ` Remplissage: ${ctx.parsed.y}%`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: {
                font: { family: 'Plus Jakarta Sans', size: 11 },
                callback: (value: any) => value + '%'
              }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
            }
          }
        }
      });
    }

    // Initialize category pie chart
    if (this.categoryChart) {
      const ctx = this.categoryChart.nativeElement.getContext('2d');
      this.categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Débordement', 'Dépôt sauvage', 'Odeur', 'Bac cassé', 'Autres'],
          datasets: [{
            data: [25, 30, 15, 20, 10],
            backgroundColor: [
              'rgba(44, 122, 62, 0.85)',
              'rgba(0, 210, 255, 0.85)',
              'rgba(245, 158, 11, 0.85)',
              'rgba(139, 92, 246, 0.85)',
              'rgba(239, 68, 68, 0.85)'
            ],
            borderWidth: 3,
            borderColor: '#fff',
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { family: 'Plus Jakarta Sans', size: 11 },
                padding: 12,
                usePointStyle: true
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  const total = (ctx.dataset.data as number[]).reduce((a, v) => a + v, 0);
                  const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
                  return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }
  }

  exportPDF() {
    this.http.get(`${environment.apiUrl}/stats/export/pdf`, { responseType: 'blob' }).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `binova-rapport-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    });
  }

  exportCSV() {
    this.http.get(`${environment.apiUrl}/stats/export/csv`, { responseType: 'blob' }).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `binova-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
    });
  }

  fillClass(n: number): string { return n >= 80 ? 'fill-high' : n >= 50 ? 'fill-medium' : 'fill-low'; }
  formatDay(d: string): string { return ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'][new Date(d).getDay()]; }

  refreshCharts() {
    this.ngOnInit();
    setTimeout(() => this.initCharts(), 100);
  }
}
