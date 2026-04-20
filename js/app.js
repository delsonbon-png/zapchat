// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  init() {
    console.log('🚀 ZapChat inicializando...');

    // Verificar se o Firebase foi carregado corretamente
    if (typeof firebase === 'undefined' || !auth || !db) {
      console.error('❌ Erro Crítico: Firebase ou serviços não inicializados.');
      UI.showToast('Erro ao carregar serviços essenciais. Verifique sua conexão.', 'error');
      return;
    }

    // Initialize modules
    UI.init();
    EmojiPicker.init();
    Auth.init();
    Chat.init();
    Contacts.init();
    Media.init();

    // Bind navigation
    this.bindNavigation();

    // Handle back button (mobile)
    window.addEventListener('popstate', (e) => {
      this.handleBack();
    });

    console.log('✅ ZapChat pronto!');
  },

  bindNavigation() {
    // FAB - New Chat
    const fab = document.getElementById('new-chat-fab');
    if (fab) {
      fab.addEventListener('click', () => {
        UI.showScreen('contacts', 'right');
        history.pushState({ screen: 'contacts' }, '');
      });
    }

    // Dropdown menu (Home)
    const homeMoreBtn = document.getElementById('home-more-btn');
    const homeDropdown = document.getElementById('home-dropdown-menu');
    
    if (homeMoreBtn && homeDropdown) {
      homeMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        homeDropdown.classList.toggle('hidden');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!homeDropdown.classList.contains('hidden') && !e.target.closest('#home-more-btn') && !e.target.closest('#home-dropdown-menu')) {
          homeDropdown.classList.add('hidden');
        }
      });
    }

    // Dropdown Actions
    const dropdownProfile = document.getElementById('dropdown-profile-btn');
    if (dropdownProfile) {
      dropdownProfile.addEventListener('click', () => {
        homeDropdown.classList.add('hidden');
        UI.showScreen('profile', 'right');
        history.pushState({ screen: 'profile' }, '');
      });
    }

    const dropdownClear = document.getElementById('dropdown-clear-btn');
    if (dropdownClear) {
      dropdownClear.addEventListener('click', async () => {
        homeDropdown.classList.add('hidden');
        if (confirm('Tem certeza que deseja apagar TODAS as conversas? Essa ação é irreversível.')) {
          // Utilizing Chat object if accessible or implement logic
          if (typeof Chat !== 'undefined' && Chat.conversations) {
             const allConvs = Chat.conversations.map(c => c.id);
             Chat.selectedConversations = allConvs;
             await Chat.deleteSelectedConversations();
          }
        }
      });
    }

    const dropdownLogout = document.getElementById('dropdown-logout-btn');
    if (dropdownLogout) {
      dropdownLogout.addEventListener('click', () => {
        homeDropdown.classList.add('hidden');
        if(typeof Auth !== 'undefined') Auth.logout();
      });
    }

    // Search toggle on chats screen
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const searchBar = document.getElementById('chats-search-bar');
        searchBar.classList.toggle('hidden');
        if (!searchBar.classList.contains('hidden')) {
          document.getElementById('chats-search-input').focus();
        }
      });
    }

    // Search chats
    const searchInput = document.getElementById('chats-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        this.filterChats(query);
      });
    }
  },

  filterChats(query) {
    const items = document.querySelectorAll('#chat-list .chat-item');
    items.forEach(item => {
      // Pega o nome do contato ou da conversa
      const name = (item.querySelector('.chat-item-name')?.textContent || '').toLowerCase();
      if (!query || name.includes(query)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  },

  handleBack() {
    switch (UI.currentScreen) {
      case 'chat':
        Chat.closeChat();
        break;
      case 'contacts':
      case 'profile':
      case 'contactProfile':
        UI.showScreen('chats', 'left');
        break;
      default:
        break;
    }
  }
};
