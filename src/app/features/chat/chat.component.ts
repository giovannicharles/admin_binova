import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-admin-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="chat-page">
      <!-- Header -->
      <div class="chat-header">
        <button class="back-btn" routerLink="/dashboard">
          <i class="ri-arrow-left-line"></i>
        </button>
        <div class="chat-info">
          <div class="chat-avatar">
            <i class="ri-customer-service-2-line"></i>
          </div>
          <div>
            <h2>Support BINOVA</h2>
            <span class="online-status">
              <span class="status-dot"></span>
              En ligne
            </span>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div class="messages-area" #messagesArea>
        @if (loading()) {
          <div class="loading-messages">
            @for (s of [1,2,3,4]; track s) {
              <div class="shimmer msg-skeleton" [class.right]="s % 2 === 0"></div>
            }
          </div>
        }

        @for (msg of messages(); track msg._id) {
          <div class="msg-wrap" [class.mine]="isMine(msg)">
            @if (!isMine(msg)) {
              <div class="msg-avatar">{{ msg.sender?.name?.charAt(0) }}</div>
            }
            <div class="msg-bubble" [class.mine]="isMine(msg)">
              @if (!isMine(msg)) {
                <span class="msg-sender">{{ msg.sender?.name }}</span>
              }
              @if (msg.type === 'image' && msg.imageUrl) {
                <img [src]="msg.imageUrl" class="msg-image" alt="Image">
              }
              @if (msg.content) {
                <p class="msg-text">{{ msg.content }}</p>
              }
              <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
            </div>
          </div>
        } @empty {
          @if (!loading()) {
            <div class="empty-chat">
              <i class="ri-chat-3-line"></i>
              <p>Aucun message. Commencez la conversation !</p>
            </div>
          }
        }
      </div>

      <!-- Input area -->
      <div class="chat-input-area">
        <button class="attach-btn" (click)="triggerImageUpload()">
          <i class="ri-image-add-line"></i>
        </button>
        <input #imageInput type="file" accept="image/*" hidden (change)="sendImage($event)">

        <div class="msg-input-wrap">
          <input class="msg-input" type="text" [(ngModel)]="messageText"
                 placeholder="Écrire un message..."
                 (keyup.enter)="sendMessage()">
        </div>

        <button class="send-btn" [disabled]="!messageText.trim() && !imageFile"
                (click)="sendMessage()">
          <i class="ri-send-plane-fill"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chat-page {
      height: 100dvh; display: flex; flex-direction: column; background: var(--bg-soft);
    }

    .chat-header {
      display: flex; align-items: center; gap: 16px;
      padding: 16px 20px; padding-top: calc(16px + env(safe-area-inset-top));
      color: var(--text); position: sticky; top: 0; z-index: 100;
      border-bottom: 1px solid var(--border-light);
      background: var(--bg);
    }

    .back-btn {
      width: 42px; height: 42px; border-radius: var(--radius);
      background: var(--bg-soft); border: 1px solid var(--border);
      color: var(--text-muted);
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      transition: all var(--transition);
      font-size: 20px;
      &:hover { 
        background: var(--primary-50); 
        color: var(--primary-700);
        border-color: var(--primary-200);
      }
    }

    .chat-info { display: flex; align-items: center; gap: 12px; }

    .chat-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: var(--primary-600);
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      box-shadow: var(--shadow-green);
    }

    .chat-info h2 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }

    .online-status {
      font-size: 12px; color: var(--text-muted);
      display: flex; align-items: center; gap: 6px;
    }

    .status-dot {
      width: 8px; height: 8px; border-radius: 50%; background: var(--success);
      animation: pulse-green 2s infinite;
    }

    .messages-area {
      flex: 1; overflow-y: auto; padding: 20px;
      display: flex; flex-direction: column; gap: 14px;
      -webkit-overflow-scrolling: touch;
    }

    .loading-messages { display: flex; flex-direction: column; gap: 14px; }

    .msg-skeleton {
      height: 52px; border-radius: var(--radius-lg); max-width: 65%;
      &.right { align-self: flex-end; }
    }

    .msg-wrap {
      display: flex; align-items: flex-end; gap: 10px;
      animation: slide-up 0.3s ease;

      &.mine { flex-direction: row-reverse; }
    }

    .msg-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--primary-600);
      color: #fff; font-size: 14px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: var(--shadow-green);
    }

    .msg-bubble {
      max-width: 75%; padding: 12px 16px;
      background: var(--bg); border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 6px;
      box-shadow: var(--shadow-soft);
      border: 1px solid var(--border-light);

      &.mine {
        background: var(--primary-600);
        color: #fff;
        border-radius: var(--radius-lg) var(--radius-lg) 6px var(--radius-lg);
        border: none;
        box-shadow: var(--shadow-green);
      }
    }

    .msg-sender { font-size: 12px; font-weight: 700; color: var(--primary-700); display: block; margin-bottom: 6px; }
    .msg-bubble.mine .msg-sender { color: rgba(255,255,255,0.9); }

    .msg-text { font-size: 14px; line-height: 1.6; word-break: break-word; }

    .msg-image { width: 100%; border-radius: var(--radius); max-width: 280px; display: block; margin-bottom: 8px; }

    .msg-time { font-size: 11px; color: var(--text-light); display: block; text-align: right; margin-top: 6px; }
    .msg-bubble.mine .msg-time { color: rgba(255,255,255,0.7); }

    .empty-chat { text-align: center; margin: auto; i { font-size: 56px; color: var(--text-light); display: block; margin-bottom: 16px; } p { color: var(--text-muted); font-size: 14px; } }

    .chat-input-area {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 20px; padding-bottom: calc(16px + env(safe-area-inset-bottom));
      border-top: 1px solid var(--border-light);
      position: sticky; bottom: 0;
      background: var(--bg);
    }

    .attach-btn {
      width: 44px; height: 44px; border-radius: var(--radius);
      background: var(--bg-soft); border: 1px solid var(--border); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: var(--text-muted); transition: all var(--transition); flex-shrink: 0;
      font-size: 20px;
      &:hover { 
        background: var(--primary-50); 
        color: var(--primary-700);
        border-color: var(--primary-200);
      }
    }

    .msg-input-wrap { flex: 1; }

    .msg-input {
      width: 100%; padding: 14px 18px;
      background: var(--bg-soft); border: 2px solid var(--border);
      border-radius: var(--radius-full); font-size: 14px; color: var(--text);
      outline: none; transition: all var(--transition);
      &:focus { 
        border-color: var(--primary-600);
        box-shadow: 0 0 0 4px rgba(44, 122, 62, 0.1);
      }
    }

    .send-btn {
      width: 48px; height: 48px; border-radius: var(--radius-full);
      background: var(--primary-600);
      border: none; cursor: pointer; color: #fff;
      display: flex; align-items: center; justify-content: center;
      box-shadow: var(--shadow-green); transition: all var(--transition-smooth); flex-shrink: 0;
      font-size: 20px;
      &:hover { 
        transform: scale(1.05);
        box-shadow: var(--shadow-green-lg);
      }
      &:active { transform: scale(0.95); }
      &:disabled { opacity: 0.4; transform: none; cursor: not-allowed; }
    }
  `]
})
export class AdminChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesArea') messagesArea!: ElementRef;

  messages = signal<any[]>([]);
  loading = signal(true);
  messageText = '';
  imageFile: File | null = null;
  private storageKey = 'binova_chat_messages';
  private checkInterval: any;

  constructor(
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.loadMessages();
    // Poll for new messages from client
    this.checkInterval = setInterval(() => {
      this.loadMessages();
    }, 2000);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  loadMessages() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      const loaded = JSON.parse(stored);
      // Only update if there are new messages
      if (loaded.length !== this.messages().length) {
        this.messages.set(loaded);
      }
    } else {
      // Initial welcome message
      this.messages.set([{
        _id: '1',
        content: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
        sender: { _id: 'support', name: 'Support BINOVA' },
        createdAt: new Date().toISOString(),
        type: 'text'
      }]);
    }
    this.loading.set(false);
  }

  sendMessage() {
    if (!this.messageText.trim() && !this.imageFile) return;

    const user = this.authService.currentUser;
    const newMessage = {
      _id: Date.now().toString(),
      content: this.messageText.trim(),
      sender: { _id: user?._id || 'admin', name: user?.name || 'Admin' },
      createdAt: new Date().toISOString(),
      type: this.imageFile ? 'image' : 'text',
      imageUrl: this.imageFile ? URL.createObjectURL(this.imageFile) : undefined
    };

    this.messages.update(m => [...m, newMessage]);
    localStorage.setItem(this.storageKey, JSON.stringify(this.messages()));
    this.messageText = '';
    this.imageFile = null;
  }

  triggerImageUpload() {
    document.querySelector<HTMLInputElement>('input[type=file]')?.click();
  }

  sendImage(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imageFile = file;
    this.sendMessage();
  }

  isMine(msg: any): boolean {
    return msg.sender?._id === this.authService.currentUser?._id || msg.sender?._id === 'admin';
  }

  formatTime(date: string): string {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  scrollToBottom() {
    try {
      const el = this.messagesArea?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { }
  }
}

