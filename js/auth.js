// ======================================
// ZapChat — Authentication
// ======================================

const Auth = {
  currentUser: null,
  userProfile: null,
  unsubProfile: null,

  init() {
    this.bindEvents();
    this.observeAuthState();
  },

  bindEvents() {
    document.getElementById('google-login-btn').addEventListener('click', () => this.loginWithGoogle());
    document.getElementById('logout-btn').addEventListener('click', () => this.logout());
  },

  observeAuthState() {
    if (!auth) return;
    auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('✅ Usuário autenticado:', user.email);
        this.currentUser = user;

        // Criar perfil local imediatamente (sem esperar Firestore)
        const emailPrefix = user.email ? user.email.split('@')[0].toLowerCase() : 'user';
        const searchId = emailPrefix;
        this.userProfile = {
          id: user.uid,
          email: user.email,
          displayName: user.displayName || emailPrefix,
          photoURL: user.photoURL || '',
          searchId: searchId,
          status: 'Disponível'
        };

        // Navegar para chats IMEDIATAMENTE
        this.updateProfileUI();
        UI.showScreen('chats', 'right');
        console.log('📱 Navegou para tela de chats');

        // Salvar perfil no Firestore em background (não bloqueia)
        this.saveProfileInBackground(user, searchId);

        // Carregar dados em background
        try { Chat.loadConversations(); } catch(e) { console.error('Erro ao carregar conversas:', e); }
        try { Contacts.loadContacts(); } catch(e) { console.error('Erro ao carregar contatos:', e); }

      } else {
        console.log('🔒 Usuário desconectado');
        this.currentUser = null;
        this.userProfile = null;
        if (this.unsubProfile) {
          this.unsubProfile();
          this.unsubProfile = null;
        }
        UI.showScreen('login', 'left');
      }
    });
  },

  async loginWithGoogle() {
    const btn = document.getElementById('google-login-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm" style="border-top-color:#1f1f1f"></div> Entrando...';

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      if (!auth) throw new Error('Serviço de autenticação não disponível');
      await auth.signInWithPopup(provider);
    } catch (err) {
      console.error('Erro no login:', err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        UI.showToast('Erro ao fazer login. Tente novamente.', 'error');
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Entrar com Google`;
    }
  },

  // Salvar perfil no Firestore sem bloquear a UI
  async saveProfileInBackground(user, searchId) {
    try {
      const userRef = db.collection('users').doc(user.uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        await userRef.set({
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || '',
          status: 'Disponível',
          searchId: searchId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('📝 Perfil criado no Firestore');
      } else {
        // Atualizar se mudou
        const data = doc.data();
        const updates = {};
        if (user.displayName && user.displayName !== data.displayName) {
          updates.displayName = user.displayName;
        }
        if (user.photoURL && user.photoURL !== data.photoURL) {
          updates.photoURL = user.photoURL;
        }
        // Forçar novo padrão de ID (prefixo do email) se estiver diferente ou faltando
        if (data.searchId !== searchId) {
          updates.searchId = searchId;
        }
        if (Object.keys(updates).length > 0) {
          await userRef.update(updates);
        }
        // Atualizar perfil local com dados do Firestore
        this.userProfile = { id: user.uid, ...data, ...updates };
        this.updateProfileUI();
        console.log('📝 Perfil atualizado do Firestore');
      }
    } catch (err) {
      console.warn('⚠️ Firestore indisponível, usando dados locais:', err.message);
      // App continua funcionando com dados locais do Google
    }
  },

  updateProfileUI() {
    if (!this.userProfile) return;

    const { displayName, email, photoURL, id } = this.userProfile;
    // O ID agora é sempre o prefixo do email por padrão
    const idFromEmail = email ? email.split('@')[0].toLowerCase() : '--------';
    const finalId = idFromEmail;

    // Profile screen
    document.getElementById('profile-name').textContent = displayName || '';
    
    // Antigo profile-email era só <div id="profile-email"> abaixo do nome, removido no HTML
    const emailField = document.getElementById('profile-email-field');
    if (emailField) emailField.textContent = email || '';
    
    document.getElementById('profile-id').textContent = finalId;

    const avatarEl = document.getElementById('profile-avatar');
    if (photoURL) {
      avatarEl.innerHTML = `<img src="${photoURL}" alt="${displayName}">`;
    } else {
      const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';
      avatarEl.innerHTML = `<span class="avatar-placeholder" style="font-size:2.5rem">${initial}</span>`;
    }
  },

  async logout() {
    try {
      Chat.cleanup();
      Contacts.cleanup();
      if (!auth) return;
      await auth.signOut();
      UI.showToast('Desconectado com sucesso');
    } catch (err) {
      console.error('Erro ao sair:', err);
      UI.showToast('Erro ao sair', 'error');
    }
  }
};
