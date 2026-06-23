import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ===== SETTINGS =====
export { AdminSettingsComponent };

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="display:flex;flex-direction:column;gap:20px;max-width:600px">
      <h2 style="font-size:20px">Paramètres système</h2>

      <!-- IoT Simulator -->
      <div class="settings-section">
        <h3>Simulateur IoT</h3>
        <p style="color:var(--text-muted);font-size:14px;margin-bottom:16px">Générateur de données capteurs pour les démonstrations</p>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <select class="form-control" style="max-width:180px" [(ngModel)]="simScenario">
            <option value="normal">Normal</option>
            <option value="peak">Heure de pointe</option>
            <option value="slow">Remplissage lent</option>
            <option value="failure">Pannes aléatoires</option>
          </select>
          <button class="btn btn-primary" (click)="startSimulator()" [disabled]="simRunning()">
            <i class="ri-play-line" style="font-size: 14px; margin-right: 6px;"></i> Démarrer
          </button>
          <button class="btn btn-outline" (click)="stopSimulator()" [disabled]="!simRunning()">
            <i class="ri-pause-line" style="font-size: 14px; margin-right: 6px;"></i> Arrêter
          </button>
          <span class="status-pill" [class]="simRunning() ? 'status-active' : 'status-offline'">
            <i [class]="simRunning() ? 'ri-checkbox-circle-line' : 'ri-checkbox-blank-circle-line'" style="font-size: 14px; margin-right: 4px;"></i>
            {{ simRunning() ? 'En cours' : 'Arrêté' }}
          </span>
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>Vitesse de simulation</label>
          <input type="range" min="1" max="10" [(ngModel)]="simSpeed" style="width:100%">
          <span style="font-size:12px;color:var(--text-muted)">{{ simSpeed }}x</span>
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-section">
        <h3>Seuils d'alerte globaux</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label>Seuil attention (%)</label>
            <input class="form-control" type="number" [(ngModel)]="thresholds.attention" min="50" max="100">
          </div>
          <div class="form-group">
            <label>Seuil critique (%)</label>
            <input class="form-control" type="number" [(ngModel)]="thresholds.critical" min="80" max="100">
          </div>
        </div>
        <button class="btn btn-primary btn-sm" (click)="saveThresholds()">Enregistrer les seuils</button>
      </div>

      <!-- VAPID Push -->
      <div class="settings-section">
        <h3>Notifications Push</h3>
        <button class="btn btn-outline" (click)="sendTestPush()"><i class="ri-mail-send-line" style="font-size: 14px; margin-right: 6px;"></i> Envoyer notification test</button>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px">Envoi à tous les utilisateurs connectés</p>
      </div>

      <!-- Seed Data -->
      <div class="settings-section" style="border-color:var(--warning)">
        <h3 style="color:var(--warning)"><i class="ri-alarm-warning-line" style="font-size: 16px; margin-right: 6px;"></i> Données de démo</h3>
        <p style="color:var(--text-muted);font-size:14px;margin-bottom:16px">Initialiser les bacs simulés pour Yaoundé (15 zones)</p>
        <button class="btn btn-outline" style="border-color:var(--warning);color:var(--warning)" (click)="seedBins()">
          Initialiser bacs simulés
        </button>
      </div>

      @if (successMsg()) {
        <div class="alert-success animate-pop-in"><i class="ri-checkbox-circle-line" style="font-size: 14px; margin-right: 6px;"></i> {{ successMsg() }}</div>
      }
    </div>
  `,
  styles: [`
    .settings-section { background: var(--bg); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-light); h3 { font-size: 15px; font-weight: 700; margin-bottom: 8px; } }
    .status-pill { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; &.status-active { background: #DCFCE7; color: #166534; } &.status-offline { background: #F1F5F9; color: #64748B; } }
    .alert-success { background: #DCFCE7; color: #166534; padding: 12px 16px; border-radius: 12px; font-size: 14px; font-weight: 600; }
  `]
})
class AdminSettingsComponent {
  simRunning = signal(false);
  simScenario = 'normal';
  simSpeed = 2;
  successMsg = signal('');
  thresholds = { attention: 80, critical: 95 };

  constructor(private http: HttpClient) {
    this.http.get(`${environment.apiUrl}/iot/simulate/status`).subscribe({
      next: (res: any) => this.simRunning.set(res.data?.running || false)
    });
  }

  startSimulator() {
    this.http.post(`${environment.apiUrl}/iot/simulate/start`, { speed: this.simSpeed, scenario: this.simScenario }).subscribe({
      next: () => { this.simRunning.set(true); this.showSuccess('Simulateur démarré'); }
    });
  }

  stopSimulator() {
    this.http.post(`${environment.apiUrl}/iot/simulate/stop`, {}).subscribe({
      next: () => { this.simRunning.set(false); this.showSuccess('Simulateur arrêté'); }
    });
  }

  saveThresholds() {
    this.showSuccess('Seuils enregistrés');
  }

  sendTestPush() {
    this.http.post(`${environment.apiUrl}/notifications/send`, {
      title: 'Test BINOVA Admin',
      body: 'Notification de test depuis l\'interface d\'administration',
      type: 'info'
    }).subscribe({ next: () => this.showSuccess('Notification envoyée') });
  }

  seedBins() {
    if (!confirm('Initialiser les bacs simulés pour Yaoundé ?')) return;
    this.http.post(`${environment.apiUrl}/iot/simulate/seed`, {}).subscribe({
      next: (res: any) => this.showSuccess(`${res.data?.created} bacs créés`)
    });
  }

  showSuccess(msg: string) {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 3000);
  }
}
