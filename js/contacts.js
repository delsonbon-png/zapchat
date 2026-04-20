// ======================================
// ZapChat — Contacts Management
// ======================================

const Contacts = {
  contacts: [],
  unsubContacts: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Add contact button
    document.getElementById('add-contact-btn').addEventListener('click', () => {
      UI.openAddContactModal();
    });

    // Modal cancel
    document.getElementById('add-contact-cancel').addEventListener('click', () => {
      UI.closeAddContactModal();
    });

    // Modal confirm
    document.getElementById('add-contact-confirm').addEventListener('click', () => {
      this.addContact();
    });

    // Modal overlay click
    document.getElementById('add-contact-modal').addEventListener('click', (e) => {
      if (e.target.id === 'add-contact-modal') UI.closeAddContactModal();
    });

    // Search contacts (Local Filter)
    document.getElementById('contacts-search-input').addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      this.filterLocalContacts(query);
    });

    // Enter on modal
    document.getElementById('add-contact-email').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addContact();
    });
  },

  loadContacts() {
    if (!Auth.currentUser) return;

    if (this.unsubContacts) this.unsubContacts();

    this.unsubContacts = db.collection('contacts')
      .doc(Auth.currentUser.uid)
      .collection('contactList')
      .orderBy('customName')
      .onSnapshot(snapshot => {
        this.contacts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        this.renderContacts();
        document.getElementById('contacts-count').textContent = `${this.contacts.length} contato${this.contacts.length !== 1 ? 's' : ''}`;
        
        // Sincronizar nomes na tela inicial caso tenham mudado
        // Usamos setTimeout(0) para garantir que o Chat tenha processado sua lista
        setTimeout(() => {
          if (typeof Chat !== 'undefined' && Chat.renderConversations) {
            Chat.renderConversations();
          }
        }, 0);
      }, err => {
        console.error('Erro ao carregar contatos:', err);
      });
  },

  renderContacts() {
    const container = document.getElementById('contacts-items');

    if (this.contacts.length === 0) {
      container.innerHTML = `
        <div style="padding:var(--space-8) var(--space-4);text-align:center;color:var(--text-secondary)">
          <p>Nenhum contato salvo</p>
          <p style="font-size:var(--font-size-sm);margin-top:var(--space-2)">Toque em "Adicionar contato" acima</p>
        </div>`;
      return;
    }

    container.innerHTML = this.contacts.map(contact => `
      <div class="contact-item" data-user-id="${contact.userId}">
        <div class="avatar avatar-lg">
          ${contact.photoURL
        ? `<img src="${contact.photoURL}" alt="${contact.customName}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''}
          <span class="avatar-placeholder" ${contact.photoURL ? 'style="display:none"' : ''}>${contact.customName ? contact.customName.charAt(0).toUpperCase() : '?'}</span>
        </div>
        <div class="contact-info">
          <div class="contact-name">${contact.customName || contact.email || 'Sem nome'}</div>
          <div class="contact-status">${contact.email || contact.userId}</div>
        </div>
        <button class="btn-icon btn-delete-contact" data-user-id="${contact.userId}" data-name="${contact.customName || contact.email}" title="Excluir contato">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
    `).join('');

    // Click handlers
    container.querySelectorAll('.contact-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Se clicar no botão de deletar, não abre o chat
        if (e.target.closest('.btn-delete-contact')) return;

        const userId = item.dataset.userId;
        this.startChatWithUser(userId);
      });
    });

    // Delete handlers
    container.querySelectorAll('.btn-delete-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = btn.dataset.userId;
        const name = btn.dataset.name;
        this.deleteContact(userId, name);
        this.renderContacts();
      });
    });
  },

  getContactName(uid) {
    const contact = this.contacts.find(c => c.userId === uid);
    return contact ? contact.customName : null;
  },

  isContact(uid) {
    return this.contacts.some(c => c.userId === uid);
  },

  filterLocalContacts(query) {
    const items = document.querySelectorAll('#contacts-items .contact-item');
    items.forEach(item => {
      const name = (item.querySelector('.contact-name')?.textContent || '').toLowerCase();
      const emailOrId = (item.querySelector('.contact-status')?.textContent || '').toLowerCase();

      if (!query || name.includes(query) || emailOrId.includes(query)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });

    // Make sure we hide any global search UI that might have been leftover
    document.getElementById('search-results').classList.add('hidden');
  },

  async quickAddAndChat(userId, email, name, photoURL) {
    // Add contact and start chat
    try {
      const contactRef = db.collection('contacts')
        .doc(Auth.currentUser.uid)
        .collection('contactList')
        .doc(userId);

      const existing = await contactRef.get();
      if (!existing.exists) {
        await contactRef.set({
          userId: userId,
          email: email,
          customName: name,
          photoURL: photoURL,
          addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      this.startChatWithUser(userId);
    } catch (err) {
      console.error('Erro ao adicionar contato:', err);
      UI.showToast('Erro ao adicionar contato', 'error');
    }
  },

  async addContact() {
    const emailInput = document.getElementById('add-contact-email');
    const nameInput = document.getElementById('add-contact-name');
    const emailOrId = emailInput.value.trim();
    const customName = nameInput.value.trim();

    if (!emailOrId) {
      UI.showToast('Informe o email ou ID do contato', 'error');
      return;
    }

    const confirmBtn = document.getElementById('add-contact-confirm');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Buscando...';

    try {
      // Try to find user by email
      let userDoc = null;

      const emailResult = await db.collection('users')
        .where('email', '==', emailOrId.toLowerCase())
        .limit(1)
        .get();

      if (!emailResult.empty) {
        userDoc = emailResult.docs[0];
      } else {
        // Try by searchId (agora é o prefixo do email)
        const searchId = emailOrId.toLowerCase().split('@')[0];
        const idResult = await db.collection('users')
          .where('searchId', '==', searchId)
          .limit(1)
          .get();

        if (!idResult.empty) {
          userDoc = idResult.docs[0];
        }
      }

      if (!userDoc) {
        UI.showToast('Usuário não encontrado', 'error');
        return;
      }

      if (userDoc.id === Auth.currentUser.uid) {
        UI.showToast('Você não pode adicionar a si mesmo', 'error');
        return;
      }

      const userData = userDoc.data();

      // Save contact
      await this.addContactByUid(userDoc.id, customName || userData.displayName, userData.email, userData.photoURL || '');
      this.closeModal();

    } catch (err) {
      console.error('Erro ao adicionar contato:', err);
      UI.showToast('Erro ao adicionar contato', 'error');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Adicionar';
    }
  },

  async addContactByUid(uid, name, email, photoURL) {
    if (!Auth.currentUser) return;
    try {
      await db.collection('contacts')
        .doc(Auth.currentUser.uid)
        .collection('contactList')
        .doc(uid)
        .set({
          userId: uid,
          email: email || '',
          customName: name || email || 'Usuário',
          photoURL: photoURL || '',
          addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      UI.showToast(`${name || 'Contato'} adicionado!`);
      return true;
    } catch (err) {
      console.error('Erro ao adicionar contato por UID:', err);
      UI.showToast('Erro ao adicionar contato', 'error');
      return false;
    }
  },

  isContact(uid) {
    return this.contacts.some(c => c.userId === uid);
  },

  closeModal() {
    UI.closeAddContactModal();
  },

  async startChatWithUser(targetUserId) {
    console.log('💬 Iniciando conversa com:', targetUserId);

    // 1. Obter dados básicos imediatamente
    const contact = this.contacts.find(c => c.userId === targetUserId);
    const displayName = contact ? contact.customName : 'Usuário';
    const photoURL = contact ? (contact.photoURL || '') : '';
    const convId = this.getConversationId(Auth.currentUser.uid, targetUserId);

    // 2. NAVEGAR IMEDIATAMENTE (Não deixar o usuário esperando o banco)
    Chat.openChat(convId, targetUserId, displayName, photoURL);
    console.log('✅ Tela de chat aberta (offline/preview)');

    // 3. Executar lógica de banco em background
    // (Removido a criação antecipada do documento para impedir que a conversa vazia
    //  apareça para a outra pessoa antes de uma mensagem ser realmente enviada)

  },

  async deleteContact(targetUserId, contactName) {
    if (!confirm(`Tem certeza que deseja excluir o contato "${contactName}"? A conversa será removida apenas para você.`)) return;

    try {
      // 1. Apagar o contato da lista (açao privada)
      await db.collection('contacts')
        .doc(Auth.currentUser.uid)
        .collection('contactList')
        .doc(targetUserId)
        .delete();

      // 2. Marcar conversa como deletada/limpa para mim (açao privada)
      const convId = this.getConversationId(Auth.currentUser.uid, targetUserId);
      const now = firebase.firestore.Timestamp.now();
      const myUid = Auth.currentUser.uid;

      await db.collection('conversations').doc(convId).set({
        deletedBy: firebase.firestore.FieldValue.arrayUnion(myUid),
        clearedAt: {
          [myUid]: now
        }
      }, { merge: true }).catch(() => { }); // Ignora se a conversa não existir

      UI.showToast('Contato excluído');
    } catch (err) {
      console.error('Erro ao excluir contato:', err);
      UI.showToast('Erro ao excluir contato', 'error');
    }
  },

  getConversationId(uid1, uid2) {
    // Create deterministic conversation ID
    return [uid1, uid2].sort().join('_');
  },

  isContact(uid) {
    return this.contacts.some(c => c.userId === uid);
  },

  getContactName(userId) {
    const contact = this.contacts.find(c => c.userId === userId);
    return contact ? contact.customName : null;
  },

  cleanup() {
    if (this.unsubContacts) {
      this.unsubContacts();
      this.unsubContacts = null;
    }
    this.contacts = [];
  }
};
