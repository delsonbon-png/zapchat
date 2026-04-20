// ======================================
// ZapChat — UI Utilities
// ======================================

const UI = {
  // Referências de telas
  screens: {
    login: document.getElementById('login-screen'),
    chats: document.getElementById('chats-screen'),
    chat: document.getElementById('chat-screen'),
    contacts: document.getElementById('contacts-screen'),
    profile: document.getElementById('profile-screen'),
    contactProfile: document.getElementById('contact-profile-screen')
  },

  currentScreen: 'login',

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Voltar de diversas telas (IDs no index.html usam kebab-case)
    const backMappings = {
      'profile': 'profile-back-btn',
      'contacts': 'contacts-back-btn',
      'contactProfile': 'contact-profile-back-btn'
    };

    Object.entries(backMappings).forEach(([screenName, btnId]) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => {
          this.showScreen('chats', 'left');
          if (history.state && history.state.screen === screenName) {
            history.back();
          }
        });
      }
    });

    // Botão Voltar do Chat (específico)
    const chatBackBtn = document.getElementById('chat-back-btn');
    if (chatBackBtn) {
      chatBackBtn.addEventListener('click', () => {
        if (typeof Chat !== 'undefined') Chat.closeChat();
      });
    }
  },

  // ── Navegação de Telas ──
  showScreen(name, direction = 'right') {
    if (name === this.currentScreen) return;

    const prevScreen = this.currentScreen;
    const prevEl = this.screens[prevScreen];
    const nextEl = this.screens[name];

    if (!nextEl) return;

    console.log(`📱 Navegando: ${prevScreen} → ${name} (${direction})`);

    // Preparar a próxima tela
    nextEl.style.transition = 'none';
    if (direction === 'right') {
      nextEl.classList.add('screen-hidden');
      nextEl.classList.remove('screen-hidden-left');
    } else {
      nextEl.classList.add('screen-hidden-left');
      nextEl.classList.remove('screen-hidden');
    }
    
    // Forçar reflow
    nextEl.offsetHeight;
    
    // Iniciar animação
    requestAnimationFrame(() => {
      nextEl.style.transition = '';
      nextEl.classList.remove('screen-hidden', 'screen-hidden-left');
      
      if (prevEl) {
        if (direction === 'right') {
          prevEl.classList.add('screen-hidden-left');
        } else {
          prevEl.classList.add('screen-hidden');
        }
      }
    });

    this.currentScreen = name;
  },

  hideScreen(name) {
    const screen = this.screens[name];
    if (screen) {
      screen.classList.add('screen-hidden');
    }
  },

  // ── Toast ──
  showToast(message, type = 'default', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ── Formatação de tempo ──
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Hoje
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    // Ontem
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }

    // Nesta semana
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return days[date.getDay()];
    }

    // Mais antigo
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  },

  // ── Modais ──
  openAddContactModal(email = '', name = '', isEdit = false) {
    const modal = document.getElementById('add-contact-modal');
    const emailInput = document.getElementById('add-contact-email');
    const nameInput = document.getElementById('add-contact-name');
    
    if (modal && emailInput && nameInput) {
      emailInput.value = email;
      nameInput.value = name;
      
      const titleEl = modal.querySelector('.modal-title');
      if (titleEl) {
        titleEl.textContent = isEdit ? 'Editar Usuário' : 'Adicionar Contato';
      }

      modal.classList.remove('hidden');
      if (name) {
        nameInput.focus();
      } else {
        emailInput.focus();
      }
    }
  },

  closeAddContactModal() {
    const modal = document.getElementById('add-contact-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.getElementById('add-contact-email').value = '';
      document.getElementById('add-contact-name').value = '';
    }
  },

  formatMessageTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  formatDateSeparator(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) return 'Hoje';

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  },

  // ── Avatar ──
  createAvatarHTML(photoURL, name, size = '') {
    const sizeClass = size ? `avatar-${size}` : '';
    if (photoURL) {
      return `<div class="avatar ${sizeClass}"><img src="${photoURL}" alt="${name || ''}" onerror="this.parentElement.innerHTML='<span class=\\'avatar-placeholder\\'>${this.getInitial(name)}</span>'"></div>`;
    }
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    return `<div class="avatar ${sizeClass}"><span class="avatar-placeholder">${initial}</span></div>`;
  },

  getInitial(name) {
    return name ? name.charAt(0).toUpperCase() : '?';
  },

  // ── Status ícones ──
  getStatusIcon(status) {
    switch (status) {
      case 'pending':
        return `<span class="bubble-status"><svg viewBox="0 0 24 24" class="pending"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></span>`;
      case 'sent':
        return `<span class="bubble-status"><svg viewBox="0 0 16 15" class="sent"><path d="M10.91 3.316l-.478-.372a.365.365 0 00-.51.063L4.566 9.879a.32.32 0 01-.484.033L1.891 7.769a.366.366 0 00-.515.006l-.423.433a.364.364 0 00.006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 00-.063-.51z"/></svg></span>`;
      case 'delivered':
        return `<span class="bubble-status"><svg viewBox="0 0 16 15" class="delivered"><path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033l-.358-.325a.319.319 0 00-.484.032l-.378.483a.418.418 0 00.036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 00-.063-.51zm-4.1 0l-.478-.372a.365.365 0 00-.51.063L4.566 9.879a.32.32 0 01-.484.033L1.891 7.769a.366.366 0 00-.515.006l-.423.433a.364.364 0 00.006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 00-.063-.51z"/></svg></span>`;
      case 'read':
        return `<span class="bubble-status"><svg viewBox="0 0 16 15" class="read"><path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033l-.358-.325a.319.319 0 00-.484.032l-.378.483a.418.418 0 00.036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 00-.063-.51zm-4.1 0l-.478-.372a.365.365 0 00-.51.063L4.566 9.879a.32.32 0 01-.484.033L1.891 7.769a.366.366 0 00-.515.006l-.423.433a.364.364 0 00.006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 00-.063-.51z"/></svg></span>`;
      default:
        return '';
    }
  },


  // ── File size formatter ──
  formatFileSize(bytes) {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
  },

  // ── Truncar texto ──
  truncate(text, maxLength = 40) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  },

  // ── Loading state ──
  showLoading(element) {
    element.innerHTML = '<div style="display:flex;justify-content:center;padding:var(--space-8)"><div class="spinner"></div></div>';
  },

  hideLoading(element) {
    const spinner = element.querySelector('.spinner');
    if (spinner) spinner.parentElement.remove();
  }
};
