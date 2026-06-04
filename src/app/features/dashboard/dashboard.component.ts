import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SocketService } from '../../core/services/socket.service';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="admin-dashboard">
      <!-- Top Alert Banner - Enhanced -->
      @if (criticalBins().length > 0) {
        <div class="critical-banner card-hover">
          <span class="banner-pulse"></span>
          <div class="banner-content">
            <i class="ri-alarm-warning-line" style="font-size: 24px;"></i>
            <div>
              <strong>{{ criticalBins().length }} bac(s) en état critique</strong>
              <p>Nécessite une intervention immédiate</p>
            </div>
          </div>
          <button class="btn-emergency" routerLink="/map">
            Créer tournée d'urgence
          </button>
        </div>
      }

      <!-- Toast notifications - Enhanced -->
      @for (toast of toasts(); track $index) {
        <div class="admin-toast animate-slide-up glass" [class]="'toast-' + toast.type">
          <span class="toast-icon">
            @if (toast.type === 'critical') {
              <i class="ri-error-warning-line" style="font-size: 18px;"></i>
            } @else if (toast.type === 'attention') {
              <i class="ri-alert-line" style="font-size: 18px;"></i>
            } @else {
              <i class="ri-information-line" style="font-size: 18px;"></i>
            }
          </span>
          {{ toast.message }}
        </div>
      }

      <!-- KPI Row - Enhanced -->
      <div class="kpi-row">
        @if (loading()) {
          @for (s of [1,2,3,4,5,6]; track s) {
            <div class="shimmer kpi-shimmer"></div>
          }
        } @else {
          <div class="admin-kpi card-hover animate-slide-up delay-1">
            <div class="kpi-top">
              <span class="kpi-icon-wrapper" style="background: var(--primary-50)">
                <i class="ri-delete-bin-line" style="color: var(--primary-600); font-size: 20px;"></i>
              </span>
              <span class="kpi-trend up">+{{ stats()?.bins?.active || 0 }}</span>
            </div>
            <div class="kpi-val">{{ stats()?.bins?.total || 0 }}</div>
            <div class="kpi-lbl">Bacs connectés</div>
          </div>
          <div class="admin-kpi card-hover animate-slide-up delay-2" style="border-top: 3px solid var(--warning)">
            <div class="kpi-top">
              <span class="kpi-icon-wrapper" style="background: var(--warning-soft)">
                <i class="ri-alert-line" style="color: var(--warning); font-size: 20px;"></i>
              </span>
            </div>
            <div class="kpi-val" style="color: var(--warning)">{{ stats()?.bins?.full || 0 }}</div>
            <div class="kpi-lbl">Bacs pleins</div>
          </div>
          <div class="admin-kpi card-hover animate-slide-up delay-3" style="border-top: 3px solid var(--error)">
            <div class="kpi-top">
              <span class="kpi-icon-wrapper" style="background: var(--error-soft)">
                <i class="ri-wifi-off-line" style="color: var(--error); font-size: 20px;"></i>
              </span>
            </div>
            <div class="kpi-val" style="color: var(--error)">{{ stats()?.bins?.offline || 0 }}</div>
            <div class="kpi-lbl">Hors ligne</div>
          </div>
          <div class="admin-kpi card-hover animate-slide-up delay-4">
            <div class="kpi-top">
              <span class="kpi-icon-wrapper" style="background: var(--info-soft)">
                <i class="ri-clipboard-line" style="color: var(--info); font-size: 20px;"></i>
              </span>
            </div>
            <div class="kpi-val">{{ stats()?.reports?.pending || 0 }}</div>
            <div class="kpi-lbl">Signalements</div>
          </div>
          <div class="admin-kpi card-hover animate-slide-up delay-5" style="border-top: 3px solid var(--success)">
            <div class="kpi-top">
              <span class="kpi-icon-wrapper" style="background: var(--success-soft)">
                <i class="ri-check-double-line" style="color: var(--success); font-size: 20px;"></i>
              </span>
            </div>
            <div class="kpi-val" style="color: var(--success)">{{ stats()?.reports?.resolvedToday || 0 }}</div>
            <div class="kpi-lbl">Résolus auj.</div>
          </div>
          <div class="admin-kpi card-hover animate-slide-up delay-6">
            <div class="kpi-top">
              <span class="kpi-icon-wrapper" style="background: var(--accent-soft)">
                <i class="ri-user-line" style="color: var(--accent); font-size: 20px;"></i>
              </span>
            </div>
            <div class="kpi-val">{{ stats()?.users?.total || 0 }}</div>
            <div class="kpi-lbl">Citoyens</div>
          </div>
        }
      </div>

      <!-- Main Grid - Enhanced -->
      <div class="admin-grid">
        <!-- Predictive Insights - New Feature -->
        <div class="admin-card card-hover predictive-card">
          <div class="card-header">
            <h3><i class="ri-brain-line" style="font-size: 18px; margin-right: 6px;"></i> Insights prédictifs</h3>
            <span class="badge badge-info">IA</span>
          </div>
          <div class="insights-list">
            <div class="insight-item">
              <div class="insight-icon" style="background: var(--warning-soft);">
                <i class="ri-timer-flash-line" style="color: var(--warning); font-size: 16px;"></i>
              </div>
              <div class="insight-content">
                <strong>Prédiction de saturation</strong>
                <p>Zone Bastos atteindra 85% dans ~12h</p>
              </div>
            </div>
            <div class="insight-item">
              <div class="insight-icon" style="background: var(--success-soft);">
                <i class="ri-trending-down-line" style="color: var(--success); font-size: 16px;"></i>
              </div>
              <div class="insight-content">
                <strong>Tendance positive</strong>
                <p>Signalements -15% cette semaine</p>
              </div>
            </div>
            <div class="insight-item">
              <div class="insight-icon" style="background: var(--primary-50);">
                <i class="ri-route-line" style="color: var(--primary-600); font-size: 16px;"></i>
              </div>
              <div class="insight-content">
                <strong>Optimisation tournée</strong>
                <p>Économie de 23km possible</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Fill by zone chart -->
        <div class="admin-card card-hover">
          <div class="card-header">
            <h3>Remplissage par zone</h3>
            <a routerLink="/bins" class="card-link">Voir tout →</a>
          </div>
          @if (fillByZone().length > 0) {
            <div class="zone-chart">
              @for (zone of fillByZone().slice(0, 8); track zone._id) {
                <div class="zone-row">
                  <span class="zone-name">{{ zone._id }}</span>
                  <div class="zone-bar-wrap">
                    <div class="zone-bar" [style.width.%]="zone.avgFill" [class]="fillClass(zone.avgFill)"></div>
                  </div>
                  <span class="zone-pct" [style.color]="fillColor(zone.avgFill)">{{ zone.avgFill | number:'1.0-0' }}%</span>
                </div>
              }
            </div>
          } @else {
            <div class="no-data">Chargement...</div>
          }
        </div>

        <!-- Recent alerts -->
        <div class="admin-card card-hover">
          <div class="card-header">
            <h3>Alertes récentes</h3>
            <span class="live-indicator"><span class="live-dot"></span> LIVE</span>
          </div>
          <div class="alerts-list">
            @for (alert of recentAlerts(); track $index) {
              <div class="alert-row card-hover" [class]="'alert-' + alert.type">
                <span class="alert-dot" [class]="'dot-' + alert.type"></span>
                <div class="alert-text">
                  <strong>{{ alert.bin }}</strong>
                  <span>{{ alert.message }}</span>
                </div>
                <span class="alert-time">{{ alert.time }}</span>
              </div>
            } @empty {
              <div class="no-alerts">
                <i class="ri-checkbox-circle-line" style="font-size: 32px; color: var(--success);"></i>
                Aucune alerte active
              </div>
            }
          </div>
        </div>

        <!-- Reports by status (kanban preview) -->
        <div class="admin-card card-hover">
          <div class="card-header">
            <h3>Signalements</h3>
            <a routerLink="/reports" class="card-link">Gérer →</a>
          </div>
          <div class="kanban-preview">
            @for (col of kanbanCols; track col.key) {
              <div class="kanban-col card-hover">
                <div class="kanban-header" [style.background]="col.color + '20'" [style.color]="col.color">
                  <span>{{ col.icon }}</span>
                  <span>{{ col.label }}</span>
                </div>
                <div class="kanban-count">{{ getReportCount(col.key) }}</div>
              </div>
            }
          </div>
        </div>

        <!-- Quick actions -->
        <div class="admin-card card-hover">
          <div class="card-header"><h3>Actions rapides</h3></div>
          <div class="quick-grid">
            <a routerLink="/bins/new" class="quick-action-btn">
              <i class="ri-add-line" style="font-size: 18px;"></i>
              Ajouter bac
            </a>
            <a routerLink="/tours/new" class="quick-action-btn">
              <i class="ri-truck-line" style="font-size: 18px;"></i>
              Nouvelle tournée
            </a>
            <a routerLink="/users" class="quick-action-btn">
              <i class="ri-user-line" style="font-size: 18px;"></i>
              Utilisateurs
            </a>
            <button class="quick-action-btn" (click)="startIoTSimulator()">
              <i class="ri-flashlight-line" style="font-size: 18px;"></i>
              Simulateur IoT
            </button>
            <button class="quick-action-btn" (click)="exportReport()">
              <i class="ri-file-chart-line" style="font-size: 18px;"></i>
              Export PDF
            </button>
            <a routerLink="/settings" class="quick-action-btn">
              <i class="ri-settings-4-line" style="font-size: 18px;"></i>
              Paramètres
            </a>
          </div>
        </div>
      </div>

      <!-- Charts Section - Enhanced -->
      <div class="charts-section">
        <div class="admin-card card-hover chart-card">
          <div class="card-header">
            <h3>Évolution des collectes (7 jours)</h3>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot" style="background: var(--primary-600)"></span> Collectes</span>
              <span class="legend-item"><span class="legend-dot" style="background: var(--accent)"></span> Objectif</span>
            </div>
          </div>
          <div class="chart-container">
            <canvas #collectionChart></canvas>
          </div>
        </div>

        <div class="admin-card card-hover chart-card">
          <div class="card-header">
            <h3>Répartition par type de déchet</h3>
          </div>
          <div class="chart-container">
            <canvas #wasteTypeChart></canvas>
          </div>
        </div>

        <div class="admin-card card-hover chart-card">
          <div class="card-header">
            <h3>Remplissage par zone (histogramme)</h3>
          </div>
          <div class="chart-container">
            <canvas #zoneHistogramChart></canvas>
          </div>
        </div>

        <div class="admin-card card-hover chart-card">
          <div class="card-header">
            <h3>Performance des équipes (barres horizontales)</h3>
          </div>
          <div class="chart-container">
            <canvas #teamPerformanceChart></canvas>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard { padding: 20px; }

    .critical-banner {
      display: flex; align-items: center; gap: 16px;
      background: linear-gradient(135deg, var(--alert-red), var(--alert-orange));
      border-radius: var(--radius-xl); padding: 18px 22px; margin-bottom: 24px; color: #fff;
      box-shadow: var(--shadow-lg);

      .banner-content {
        display: flex; align-items: center; gap: 12px;
        flex: 1;
      }

      strong { display: block; font-size: 15px; font-weight: 700; }
      p { font-size: 13px; opacity: 0.9; margin: 0; }
    }

    .banner-pulse {
      width: 12px; height: 12px; border-radius: 50%; background: #fff;
      animation: pulse-green 1s infinite; flex-shrink: 0;
    }

    .btn-emergency {
      margin-left: auto; white-space: nowrap;
      background: rgba(255,255,255,0.25); color: #fff;
      border: 2px solid rgba(255,255,255,0.5);
      padding: 10px 18px; border-radius: var(--radius);
      font-size: 13px; font-weight: 700; cursor: pointer;
      flex-shrink: 0;
      transition: all var(--transition);
      &:hover { background: rgba(255,255,255,0.4); transform: translateY(-2px); }
    }

    .admin-toast {
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      border-radius: var(--radius-lg);
      padding: 14px 20px; box-shadow: var(--shadow-xl);
      font-size: 14px; font-weight: 600;
      display: flex; align-items: center; gap: 10px;
      &.toast-critical { border-left: 4px solid var(--error); background: var(--bg); }
      &.toast-attention { border-left: 4px solid var(--warning); background: var(--bg); }
      &.toast-info { border-left: 4px solid var(--primary); background: var(--bg); }
    }

    .toast-icon {
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .kpi-row {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 16px; margin-bottom: 24px;
    }

    .kpi-shimmer { height: 100px; border-radius: var(--radius-lg); }

    .admin-kpi {
      background: var(--bg); border-radius: var(--radius-lg);
      padding: 18px 20px; box-shadow: var(--shadow);
      border-top: 3px solid var(--primary);
      animation: slide-up 0.4s ease both;
    }

    .kpi-top {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 10px;
    }

    .kpi-icon-wrapper {
      width: 36px; height: 36px;
      border-radius: var(--radius);
      display: flex; align-items: center; justify-content: center;
    }

    .kpi-trend {
      font-size: 11px; font-weight: 700;
      &.up { color: var(--success); }
      &.down { color: var(--error); }
    }

    .kpi-val { font-size: 32px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
    .kpi-lbl { font-size: 12px; color: var(--text-muted); font-weight: 600; }

    .admin-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .admin-card {
      background: var(--bg); border-radius: var(--radius-xl);
      box-shadow: var(--shadow); padding: 20px;
      border: 1px solid var(--border-light);
    }

    .card-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 18px;
      h3 { font-size: 16px; font-weight: 700; }
    }

    .predictive-card {
      background: linear-gradient(135deg, var(--bg), var(--primary-50));
      border: 1px solid var(--primary-200);
    }

    .insights-list { display: flex; flex-direction: column; gap: 12px; }

    .insight-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px; background: var(--bg-soft);
      border-radius: var(--radius);
      transition: all var(--transition);
      &:hover { transform: translateX(4px); }
    }

    .insight-icon {
      width: 36px; height: 36px;
      border-radius: var(--radius);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .insight-content {
      flex: 1; min-width: 0;
      strong { display: block; font-size: 13px; font-weight: 700; margin-bottom: 2px; }
      p { font-size: 12px; color: var(--text-muted); margin: 0; }
    }

    .card-link { font-size: 13px; color: var(--primary-600); font-weight: 600; text-decoration: none; transition: color var(--transition); &:hover { color: var(--primary-700); } }

    .live-indicator {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700; color: var(--error);
      background: var(--error-soft);
      padding: 4px 10px; border-radius: var(--radius-full);
    }

    .live-dot {
      width: 6px; height: 6px; border-radius: 50%; background: var(--error);
      animation: pulse-green 1s infinite;
    }

    .zone-chart { display: flex; flex-direction: column; gap: 12px; }

    .zone-row { display: flex; align-items: center; gap: 12px; }

    .zone-name { font-size: 13px; font-weight: 600; color: var(--text-muted); width: 90px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .zone-bar-wrap { flex: 1; height: 10px; background: var(--border); border-radius: 5px; overflow: hidden; }

    .zone-bar { height: 100%; border-radius: 5px; transition: width 0.8s ease;
      &.fill-low { background: linear-gradient(90deg, var(--primary-400), var(--primary-600)); }
      &.fill-medium { background: linear-gradient(90deg, #fcd34d, var(--warning)); }
      &.fill-high { background: linear-gradient(90deg, #f87171, var(--error)); }
    }

    .zone-pct { font-size: 13px; font-weight: 700; width: 45px; text-align: right; flex-shrink: 0; }

    .alerts-list { display: flex; flex-direction: column; gap: 10px; }

    .alert-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: var(--radius);
      transition: all var(--transition);
      &.alert-critical { background: var(--error-soft); }
      &.alert-attention { background: var(--warning-soft); }
    }

    .alert-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      &.dot-critical { background: var(--error); }
      &.dot-attention { background: var(--warning); }
    }

    .alert-text { flex: 1; min-width: 0; strong { display: block; font-size: 13px; } span { font-size: 12px; color: var(--text-muted); } }
    .alert-time { font-size: 11px; color: var(--text-light); white-space: nowrap; }
    
    .no-alerts { 
      text-align: center; padding: 24px; color: var(--success); font-weight: 600; 
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      svg { margin-bottom: 4px; }
    }

    .kanban-preview { display: flex; gap: 12px; }

    .kanban-col { 
      flex: 1; text-align: center; 
      padding: 12px; border-radius: var(--radius);
      background: var(--bg-soft);
      transition: all var(--transition);
    }

    .kanban-header {
      padding: 8px 6px; border-radius: var(--radius); font-size: 11px; font-weight: 700;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      margin-bottom: 8px;
    }

    .kanban-count { font-size: 28px; font-weight: 800; color: var(--text); }

    .quick-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    }

    .quick-action-btn {
      display: flex; align-items: center; gap: 10px;
      background: var(--bg-soft); border-radius: var(--radius);
      padding: 12px 14px; font-size: 13px; font-weight: 600;
      color: var(--text); text-decoration: none; border: none; cursor: pointer;
      transition: all var(--transition-smooth); width: 100%;
      border: 1px solid var(--border-light);

      svg { flex-shrink: 0; }
      &:hover { 
        background: var(--primary-50); 
        color: var(--primary-700);
        border-color: var(--primary-200);
        transform: translateY(-2px);
      }
      &:active { transform: scale(0.97); }
    }

    .no-data { text-align: center; color: var(--text-muted); padding: 24px; font-size: 14px; }

    .charts-section {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 24px;
    }

    .chart-card {
      min-height: 350px;
    }

    .chart-legend {
      display: flex; gap: 16px; font-size: 12px; font-weight: 600;
    }

    .legend-item {
      display: flex; align-items: center; gap: 6px;
      color: var(--text-muted);
    }

    .legend-dot {
      width: 8px; height: 8px; border-radius: 50%;
    }

    .chart-container {
      position: relative;
      height: 280px;
      padding: 10px;
    }

    @media (max-width: 768px) {
      .kpi-row { grid-template-columns: repeat(2, 1fr); }
      .admin-grid { grid-template-columns: 1fr; }
      .charts-section { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  stats = signal<any>(null);
  fillByZone = signal<any[]>([]);
  criticalBins = signal<any[]>([]);
  recentAlerts = signal<any[]>([]);
  loading = signal(true);
  toasts = signal<any[]>([]);
  reportStats = signal<any>({});

  @ViewChild('collectionChart') collectionChart!: ElementRef;
  @ViewChild('wasteTypeChart') wasteTypeChart!: ElementRef;
  @ViewChild('zoneHistogramChart') zoneHistogramChart!: ElementRef;
  @ViewChild('teamPerformanceChart') teamPerformanceChart!: ElementRef;

  private collectionChartInstance: any;
  private wasteTypeChartInstance: any;
  private zoneHistogramChartInstance: any;
  private teamPerformanceChartInstance: any;

  kanbanCols = [
    { key: 'pending', label: 'Attente', icon: 'ri-time-line', color: '#F59E0B' },
    { key: 'in_progress', label: 'En cours', icon: 'ri-tools-line', color: '#3B82F6' },
    { key: 'resolved', label: 'Résolu', icon: 'ri-check-line', color: '#22C55E' }
  ];

  private subs: Subscription[] = [];

  constructor(private http: HttpClient, private socketService: SocketService) { }

  ngOnInit() {
    this.loadDashboard();
    this.socketService.connect();

    this.subs.push(
      this.socketService.on<any>('bin:alert').subscribe(data => {
        this.addAlert({
          bin: data.bin?.name || 'Inconnu',
          message: data.message,
          type: data.type,
          time: 'À l\'instant'
        });
        this.showToast(data.message, data.type === 'critical' ? 'critical' : 'attention');
        if (data.type === 'critical') {
          this.criticalBins.update(b => [...b, data.bin]);
        }
      }),
      this.socketService.on<any>('stats:live').subscribe(data => {
        if (this.stats()) {
          this.stats.update(s => ({ ...s, bins: { ...s.bins, full: data.binsAlert } }));
        }
      })
    );
  }

  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }

  loadDashboard() {
    this.loading.set(true);
    this.http.get(`${environment.apiUrl}/stats/dashboard`).subscribe({
      next: (res: any) => {
        this.stats.set(res.data);
        this.fillByZone.set(res.data?.fillByZone || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  addAlert(alert: any) {
    this.recentAlerts.update(a => [alert, ...a.slice(0, 9)]);
  }

  showToast(message: string, type: string) {
    this.toasts.update(t => [...t, { message, type }]);
    setTimeout(() => this.toasts.update(t => t.slice(1)), 5000);
  }

  getReportCount(status: string): number {
    const map: Record<string, string> = {
      pending: 'pending', in_progress: 'inProgress', resolved: 'resolvedToday'
    };
    return this.stats()?.reports?.[map[status]] || 0;
  }

  fillClass(pct: number): string {
    if (pct >= 80) return 'fill-high';
    if (pct >= 50) return 'fill-medium';
    return 'fill-low';
  }

  fillColor(pct: number): string {
    if (pct >= 80) return 'var(--error)';
    if (pct >= 50) return 'var(--warning)';
    return 'var(--primary)';
  }

  startIoTSimulator() {
    this.http.post(`${environment.apiUrl}/iot/simulate/start`, { speed: 2, scenario: 'normal' }).subscribe({
      next: () => this.showToast('Simulateur IoT démarré', 'info')
    });
  }

  exportReport() {
    this.http.get(`${environment.apiUrl}/stats/export/pdf`, { responseType: 'blob' }).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `binova-rapport-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    });
  }

  ngAfterViewInit() {
    this.initCharts();
  }

  initCharts() {
    // Initialize collection chart with mock data - inspired by design reference
    if (this.collectionChart) {
      const ctx = this.collectionChart.nativeElement.getContext('2d');
      this.collectionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
          datasets: [
            {
              label: 'Collectes réelles',
              data: [120, 190, 150, 220, 180, 250, 200],
              backgroundColor: 'rgba(44, 122, 62, 0.85)',
              borderColor: '#2C7A3E',
              borderWidth: 2,
              borderRadius: 6,
              borderSkipped: false
            },
            {
              label: 'Objectif',
              data: [150, 180, 180, 200, 200, 220, 220],
              backgroundColor: 'rgba(0, 210, 255, 0.3)',
              borderColor: '#00D2FF',
              borderWidth: 2,
              borderRadius: 4,
              borderSkipped: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: { family: 'Plus Jakarta Sans', size: 12 },
                usePointStyle: true,
                padding: 20
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y} kg`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
            }
          }
        }
      });
    }

    // Initialize waste type chart with mock data - inspired by design reference
    if (this.wasteTypeChart) {
      const ctx = this.wasteTypeChart.nativeElement.getContext('2d');
      this.wasteTypeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Organique', 'Plastique', 'Papier', 'Verre', 'Métal'],
          datasets: [{
            data: [35, 25, 20, 12, 8],
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
                  return ` ${ctx.label}: ${ctx.parsed}% (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    // Initialize zone histogram chart
    if (this.zoneHistogramChart) {
      const ctx = this.zoneHistogramChart.nativeElement.getContext('2d');
      this.zoneHistogramChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Bastos', 'Mvan', 'Nkoldongo', 'Messa', 'Ekoumdoum', 'Kondengui'],
          datasets: [{
            label: 'Remplissage moyen (%)',
            data: [72, 65, 88, 55, 78, 62],
            backgroundColor: [
              'rgba(44, 122, 62, 0.85)',
              'rgba(44, 122, 62, 0.85)',
              'rgba(239, 68, 68, 0.85)',
              'rgba(44, 122, 62, 0.85)',
              'rgba(245, 158, 11, 0.85)',
              'rgba(44, 122, 62, 0.85)'
            ],
            borderColor: [
              '#2C7A3E',
              '#2C7A3E',
              '#EF4444',
              '#2C7A3E',
              '#F59E0B',
              '#2C7A3E'
            ],
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false
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
              ticks: { font: { family: 'Plus Jakarta Sans', size: 10 }, maxRotation: 45 }
            }
          }
        }
      });
    }

    // Initialize team performance horizontal bar chart
    if (this.teamPerformanceChart) {
      const ctx = this.teamPerformanceChart.nativeElement.getContext('2d');
      this.teamPerformanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Équipe Alpha', 'Équipe Beta', 'Équipe Gamma', 'Équipe Delta'],
          datasets: [{
            label: 'Collectes effectuées',
            data: [145, 132, 168, 121],
            backgroundColor: [
              'rgba(44, 122, 62, 0.85)',
              'rgba(0, 210, 255, 0.85)',
              'rgba(245, 158, 11, 0.85)',
              'rgba(139, 92, 246, 0.85)'
            ],
            borderColor: [
              '#2C7A3E',
              '#00D2FF',
              '#F59E0B',
              '#8B5CF6'
            ],
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ` Collectes: ${ctx.parsed.x}`
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
            },
            y: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
            }
          }
        }
      });
    }
  }
}
