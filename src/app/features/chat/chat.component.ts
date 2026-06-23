import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="chat-page">
      <!-- Sidebar - Conversations List -->
      <div class="chat-sidebar">
        <div class="sidebar-header">
          <h2>Messagerie</h2>
          <div class="search-box">
            <i class="ri-search-line"></i>
            <input type="text" [(ngModel)]="searchQuery" placeholder="Rechercher...">
          </div>
        </div>
        <div class="conversations-list">
          @for (conv of filteredConversations(); track conv._id) {
            <div class="conversation-item" [class.active]="selectedConversation()?._id === conv._id"
                 (click)="selectConversation(conv)">
              <div class="conv-avatar">{{ conv.name?.charAt(0) || '?' }}</div>
              <div class="conv-info">
                <div class="conv-name-row">
                  <span class="conv-name">{{ conv.name }}</span>
                  <span class="conv-time">{{ formatLastMessageTime(conv.lastMessageAt) }}</span>
                </div>
                <div class="conv-preview">
                  <span class="conv-text">{{ conv.lastMessage || 'Aucun message' }}</span>
                  @if (conv.unreadCount > 0) {
                    <span class="unread-badge">{{ conv.unreadCount }}</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="chat-main">
        @if (selectedConversation()) {
          <!-- Header -->
          <div class="chat-header">
            <button class="back-btn" routerLink="/dashboard">
              <i class="ri-arrow-left-line"></i>
            </button>
            <div class="chat-info">
              <div class="chat-avatar">{{ selectedConversation()?.name?.charAt(0) }}</div>
              <div>
                <h2>{{ selectedConversation()?.name }}</h2>
                <span class="online-status">
                  <span class="status-dot"></span>
                  @if (socketConnected()) {
                    En ligne
                  } @else {
                    Hors ligne
                  }
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

            @if (typingUsers().length > 0) {
              <div class="typing-indicator">
                <span class="typing-dots"></span>
                <span>{{ typingUsers().join(', ') }} est en train d'écrire...</span>
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
                  @if (isMine(msg)) {
                    <span class="msg-read-status">
                      <i class="ri-check-double-line" [class.read]="msg.read"></i>
                    </span>
                  }
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
                     (keyup.enter)="sendMessage()"
                     (input)="onTyping()">
            </div>

            <button class="send-btn" [disabled]="!messageText.trim() && !imageFile"
                    (click)="sendMessage()">
              <i class="ri-send-plane-fill"></i>
            </button>
          </div>
        } @else {
          <div class="no-chat-selected">
            <i class="ri-chat-3-line"></i>
            <h3>Sélectionnez une conversation</h3>
            <p>Choisissez un client dans la liste pour commencer à discuter</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .chat-page {
      height: 100dvh; display: flex; background: var(--bg-soft);
    }

    /* Sidebar */
    .chat-sidebar {
      width: 350px;
      background: var(--bg);
      border-right: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--border-light);
    }

    .sidebar-header h2 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--bg-soft);
      border-radius: var(--radius-full);
      border: 1px solid var(--border);
    }

    .search-box i {
      color: var(--text-muted);
      font-size: 16px;
    }

    .search-box input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 14px;
      color: var(--text);
    }

    .conversations-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .conversation-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: var(--radius);
      cursor: pointer;
      transition: all var(--transition);

      &:hover {
        background: var(--bg-soft);
      }

      &.active {
        background: var(--primary-50);
      }
    }

    .conv-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      flex-shrink: 0;
    }

    .conv-info {
      flex: 1;
      min-width: 0;
    }

    .conv-name-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .conv-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }

    .conv-time {
      font-size: 11px;
      color: var(--text-muted);
    }

    .conv-preview {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .conv-text {
      font-size: 13px;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 180px;
    }

    .unread-badge {
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      background: var(--primary-600);
      color: #fff;
      border-radius: var(--radius-full);
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Main Chat Area */
    .chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .no-chat-selected {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px;
    }

    .no-chat-selected i {
      font-size: 64px;
      color: var(--text-light);
      margin-bottom: 20px;
    }

    .no-chat-selected h3 {
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 8px;
    }

    .no-chat-selected p {
      font-size: 14px;
      color: var(--text-muted);
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

    .typing-indicator {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px;
      background: var(--bg-soft);
      border-radius: var(--radius-lg);
      font-size: 13px;
      color: var(--text-muted);
      animation: slide-up 0.3s ease;
    }

    .typing-dots {
      display: flex; gap: 4px;
      span {
        width: 6px; height: 6px; border-radius: 50%;
        background: var(--primary-400);
        animation: typing-bounce 1.4s infinite ease-in-out both;
        &:nth-child(1) { animation-delay: -0.32s; }
        &:nth-child(2) { animation-delay: -0.16s; }
      }
    }

    @keyframes typing-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
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

    .msg-read-status {
      margin-left: 8px;
      font-size: 14px;
      color: rgba(255,255,255,0.5);
      &.read { color: #4ade80; }
    }

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
  conversations = signal<any[]>([]);
  selectedConversation = signal<any>(null);
  loading = signal(true);
  messageText = '';
  imageFile: File | null = null;
  searchQuery = '';
  socketConnected = signal(false);
  typingUsers = signal<string[]>([]);
  private roomId = '';
  private typingTimeout: any;

  constructor(
    private authService: AuthService,
    private socketService: SocketService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.loadConversations();
    this.socketService.connect();
    this.socketService.isConnected$.subscribe(connected => {
      this.socketConnected.set(connected);
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.roomId) {
      this.socketService.leaveRoom(this.roomId);
    }
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
  }

  filteredConversations() {
    if (!this.searchQuery) return this.conversations();
    const query = this.searchQuery.toLowerCase();
    return this.conversations().filter(c => 
      c.name?.toLowerCase().includes(query) || 
      c.lastMessage?.toLowerCase().includes(query)
    );
  }

  async loadConversations() {
    try {
      const response = await this.http.get<any>(`${environment.apiUrl}/users?role=citizen`).toPromise();
      if (response?.success) {
        const users = response.data || [];
        this.conversations.set(users.map((user: any) => ({
          _id: user._id,
          name: user.name,
          lastMessage: 'Démarrer une conversation',
          lastMessageAt: user.createdAt,
          unreadCount: 0
        })));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }

  selectConversation(conv: any) {
    this.selectedConversation.set(conv);
    this.roomId = `chat-${conv._id}`;
    this.loading.set(true);
    this.messages.set([]);

    this.socketService.joinRoom(this.roomId);
    this.loadMessages();

    // Listen for new messages
    this.socketService.on<any>('message:new').subscribe(({ message }) => {
      this.messages.update(m => [...m, message]);
      this.scrollToBottom();
    });

    // Listen for typing indicators
    this.socketService.on<any>('message:typing').subscribe(({ userId, name, isTyping }) => {
      if (isTyping) {
        this.typingUsers.update(users => [...new Set([...users, name])]);
      } else {
        this.typingUsers.update(users => users.filter(u => u !== name));
      }
    });
  }

  async loadMessages() {
    try {
      const response = await this.http.get<any>(`${environment.apiUrl}/messages/${this.roomId}`).toPromise();
      if (response?.success) {
        this.messages.set(response.data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
    this.loading.set(false);
  }

  async sendMessage() {
    if (!this.messageText.trim() && !this.imageFile) return;

    const formData = new FormData();
    formData.append('room', this.roomId);
    formData.append('content', this.messageText.trim());
    formData.append('recipientId', this.selectedConversation()?._id);
    if (this.imageFile) {
      formData.append('image', this.imageFile);
    }

    try {
      await this.http.post(`${environment.apiUrl}/messages`, formData).toPromise();
      this.messageText = '';
      this.imageFile = null;
      this.socketService.emit('message:typing', { roomId: this.roomId, isTyping: false });
    } catch (error) {
      console.error('Error sending message:', error);
    }
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

  onTyping() {
    this.socketService.emit('message:typing', { roomId: this.roomId, isTyping: true });

    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.socketService.emit('message:typing', { roomId: this.roomId, isTyping: false });
    }, 1000);
  }

  isMine(msg: any): boolean {
    return msg.sender?._id === this.authService.currentUser?._id;
  }

  formatTime(date: string): string {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  formatLastMessageTime(date: string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  }

  scrollToBottom() {
    try {
      const el = this.messagesArea?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { }
  }
}

