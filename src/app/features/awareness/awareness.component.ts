// ===== features/awareness/awareness.component.ts =====
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export { AdminAwarenessComponent };

@Component({
  selector: 'app-admin-awareness',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-awareness">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <h2>Gestion des articles</h2>
        <button class="btn btn-primary" (click)="openForm(null)">+ Nouvel article</button>
      </div>

      @if (loading()) {
        <div style="display:flex;flex-direction:column;gap:12px">
          @for (s of [1,2,3]; track s) { <div class="shimmer" style="height:80px;border-radius:14px"></div> }
        </div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:12px">
          @for (a of articles(); track a._id) {
            <div style="display:flex;align-items:center;gap:14px;background:var(--bg);border-radius:14px;padding:14px 16px;box-shadow:var(--shadow-sm)">
              <span style="font-size:28px"><i [class]="typeIcon(a.type)" style="font-size: 28px;"></i></span>
              <div style="flex:1;min-width:0">
                <h4 style="font-size:14px;font-weight:700;margin-bottom:4px">{{ a.title }}</h4>
                <div style="display:flex;gap:8px;align-items:center">
                  <span class="badge badge-info" style="font-size:11px">{{ a.type }}</span>
                  @if (a.isHealthAlert) { <span class="badge badge-danger" style="font-size:11px">Alerte santé</span> }
                  <span style="font-size:12px;color:var(--text-muted)">{{ formatDate(a.publishedAt) }}</span>
                </div>
              </div>
              <div style="display:flex;gap:6px">
                <button class="icon-action" (click)="openForm(a)"><i class="ri-edit-line" style="font-size: 16px;"></i></button>
                <button class="icon-action danger" (click)="deleteArticle(a._id)"><i class="ri-delete-bin-line" style="font-size: 16px;"></i></button>
              </div>
            </div>
          } @empty {
            <div style="text-align:center;padding:40px;color:var(--text-muted)">Aucun article. Créez-en un !</div>
          }
        </div>
      }
    </div>

    @if (showForm()) {
      <div class="modal-overlay" (click)="showForm.set(false)">
        <div class="modal animate-pop-in" (click)="$event.stopPropagation()">
          <div class="modal-header"><h3>{{ editing() ? 'Modifier l\'article' : 'Nouvel article' }}</h3><button class="modal-close" (click)="showForm.set(false)"><i class="ri-close-line" style="font-size: 16px;"></i></button></div>
          <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
            <div class="form-group"><label>Titre *</label><input class="form-control" [(ngModel)]="form.title" placeholder="Titre de l'article"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="form-group"><label>Type</label><select class="form-control" [(ngModel)]="form.type"><option value="article">Article</option><option value="video">Vidéo</option><option value="alert">Alerte</option><option value="tip">Conseil</option></select></div>
              <div class="form-group"><label>Niveau alerte</label><select class="form-control" [(ngModel)]="form.alertLevel"><option value="">Aucun</option><option value="info">Info</option><option value="warning">Avertissement</option><option value="critical">Critique</option></select></div>
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px"><label class="checkbox-label"><input type="checkbox" [(ngModel)]="form.isHealthAlert"> Alerte santé publique</label></div>
            <div class="form-group"><label>Résumé</label><textarea class="form-control" [(ngModel)]="form.summary" rows="2" placeholder="Bref résumé..."></textarea></div>
            <div class="form-group"><label>Contenu *</label><textarea class="form-control" [(ngModel)]="form.content" rows="6" placeholder="Contenu complet de l'article..."></textarea></div>
            <div class="form-group"><label>URL Image (optionnel)</label><input class="form-control" [(ngModel)]="form.imageUrl" placeholder="https://..."></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="showForm.set(false)">Annuler</button>
            <button class="btn btn-primary" [disabled]="saving() || !form.title || !form.content" (click)="saveArticle()">
              @if (saving()) { <span class="spinner-sm"></span> } {{ editing() ? 'Mettre à jour' : 'Publier' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`.icon-action{width:32px;height:32px;border-radius:8px;border:none;background:var(--bg-soft);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;&.danger:hover{background:#FEF2F2}}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px}.modal{background:var(--bg);border-radius:20px;width:100%;max-width:560px;max-height:90dvh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.2)}.modal-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border-light);h3{font-size:18px;font-weight:700}}.modal-close{width:32px;height:32px;border-radius:50%;border:none;background:var(--bg-soft);cursor:pointer;font-size:16px}.modal-body{padding:24px;overflow-y:auto;flex:1}.modal-footer{padding:16px 24px;border-top:1px solid var(--border-light);display:flex;gap:12px;justify-content:flex-end}.spinner-sm{width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block}.checkbox-label{display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;input{accent-color:var(--primary)}}`]
})
class AdminAwarenessComponent implements OnInit {
  articles = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  editing = signal<any>(null);
  form = { title: '', type: 'article', content: '', summary: '', isHealthAlert: false, alertLevel: '', imageUrl: '' };

  constructor(private http: HttpClient) { }
  ngOnInit() { this.loadArticles(); }

  loadArticles() {
    this.loading.set(true);
    this.http.get(`${environment.apiUrl}/awareness`).subscribe({
      next: (res: any) => { this.articles.set(res.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openForm(article: any) {
    this.editing.set(article);
    if (article) {
      this.form = { title: article.title, type: article.type, content: article.content, summary: article.summary || '', isHealthAlert: article.isHealthAlert, alertLevel: article.alertLevel || '', imageUrl: article.imageUrl || '' };
    } else {
      this.form = { title: '', type: 'article', content: '', summary: '', isHealthAlert: false, alertLevel: '', imageUrl: '' };
    }
    this.showForm.set(true);
  }

  saveArticle() {
    this.saving.set(true);
    const req = this.editing()
      ? this.http.put(`${environment.apiUrl}/awareness/${this.editing()._id}`, this.form)
      : this.http.post(`${environment.apiUrl}/awareness`, this.form);
    req.subscribe({ next: () => { this.saving.set(false); this.showForm.set(false); this.loadArticles(); }, error: () => this.saving.set(false) });
  }

  deleteArticle(id: string) {
    if (!confirm('Supprimer cet article ?')) return;
    this.http.delete(`${environment.apiUrl}/awareness/${id}`).subscribe({ next: () => this.loadArticles() });
  }

  typeIcon(t: string): string { return { article: 'ri-newspaper-line', video: 'ri-video-line', alert: 'ri-alarm-warning-line', tip: 'ri-lightbulb-line' }[t] || 'ri-file-list-line'; }
  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-FR') : ''; }
}
