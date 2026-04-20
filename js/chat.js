// ======================================
// ZapChat — Chat / Messaging
// ======================================

const Chat = {
  currentChatId: null,
  currentTargetId: null,
  currentTargetName: null,
  conversations: [],
  unsubConversations: null,
  unsubMessages: null,
  messages: [],
  lastDateShown: null,
  userCache: {},

  // Modo de Seleção
  selectionMode: false,
  selectedMessages: [],
  selectionModeHome: false,
  selectedConversations: [],
  longPressTimer: null,
  longPressItemTimer: null,
  longPressOccurred: false,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const bind = (id, event, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(event, fn);
      // Silenciar warnings para elementos dependentes de tela
    };

    bind('send-btn', 'click', () => this.handleSend());

    const msgInput = document.getElementById('message-input');
    if (msgInput) {
      msgInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });
    }

    bind('emoji-btn', 'click', () => {
      EmojiPicker.toggle();
      Media.closeAttachMenu();
    });

    bind('chat-back-btn', 'click', () => {
      if (this.selectionMode) {
        this.exitSelectionMode();
      } else {
        this.closeChat();
      }
    });

    bind('chat-profile-btn', 'click', () => {
      this.openContactProfile();
    });

    // Binding Selection Mode Header Buttons
    bind('selection-close-btn', 'click', () => this.exitSelectionMode());
    bind('selection-share', 'click', () => this.shareSelected());
    bind('selection-delete', 'click', () => this.showDeleteModal());

    bind('chat-messages', 'click', () => {
      EmojiPicker.close();
      Media.closeAttachMenu();
    });

    // Botões de Seleção (WhatsApp Style)
    bind('selection-cancel', 'click', () => this.exitSelectionMode());
    bind('selection-delete', 'click', () => this.showDeleteModal());
    bind('selection-share', 'click', () => this.shareSelected());

    // Modal de Exclusão Seletiva
    bind('btn-delete-cancel', 'click', () => this.closeDeleteModal());
    bind('btn-delete-for-me', 'click', () => this.confirmDelete('me'));
    bind('btn-delete-for-everyone', 'click', () => this.confirmDelete('everyone'));

    // Botões de Seleção (Home Screen)
    bind('chats-selection-cancel', 'click', () => this.exitSelectionModeHome());
    bind('chats-selection-delete', 'click', () => this.deleteSelectedConversations());
  },

  // ── Load conversations list ──
  loadConversations() {
    if (!Auth.currentUser) return;
    if (this.unsubConversations) this.unsubConversations();

    this.unsubConversations = db.collection('conversations')
      .where('participants', 'array-contains', Auth.currentUser.uid)
      .onSnapshot(async (snapshot) => {
        console.log(`📥 Atualização: ${snapshot.size} conversas encontradas.`);

        // Filtrar conversas que apaguei (marcada em deletedBy)
        const myUid = Auth.currentUser.uid;

        const convPromises = snapshot.docs
          .filter(doc => {
            const data = doc.data();
            return !(data.deletedBy && data.deletedBy.includes(myUid));
          })
          .map(async (doc) => {
            const data = doc.data();
            const isPending = doc.metadata.hasPendingWrites;
            const lastStatus = isPending ? 'pending' : (data.lastMessageStatus || 'sent');
            const otherUserId = data.participants.find(p => p !== Auth.currentUser.uid);

            let otherUser = this.userCache[otherUserId];
            if (!otherUser) {
              try {
                const userDoc = await db.collection('users').doc(otherUserId).get();
                if (userDoc.exists) {
                  otherUser = userDoc.data();
                  this.userCache[otherUserId] = otherUser;
                } else {
                  otherUser = { displayName: 'Usuário', photoURL: '', email: '' };
                }
              } catch (e) {
                otherUser = { displayName: 'Usuário', photoURL: '', email: '' };
              }
            }

            return {
              id: doc.id,
              ...data,
              lastMessageStatus: lastStatus,
              otherUserId,
              otherUserPhoto: otherUser.photoURL || '',
            };
          });

        this.conversations = await Promise.all(convPromises);
        this.conversations.sort((a, b) => {
          const valA = a.lastMessageTime ? (a.lastMessageTime.toMillis ? a.lastMessageTime.toMillis() : a.lastMessageTime) : 0;
          const valB = b.lastMessageTime ? (b.lastMessageTime.toMillis ? b.lastMessageTime.toMillis() : b.lastMessageTime) : 0;
          return valB - valA;
        });

        this.renderConversations();
      });
  },

  renderConversations() {
    const container = document.getElementById('chat-list');
    const emptyState = document.getElementById('chats-empty');
    container.querySelectorAll('.chat-item').forEach(el => el.remove());

    if (this.conversations.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    const html = this.conversations.map(conv => {
      const time = UI.formatTime(conv.lastMessageTime);
      
      // Resolução de Nomes REATIVA (Sempre pega o mais atual da Agenda)
      const contactName = Contacts.getContactName(conv.otherUserId);
      const otherUser = this.userCache[conv.otherUserId] || {};
      const idPrefix = otherUser.email ? otherUser.email.split('@')[0].toLowerCase() : '';
      const userId = otherUser.searchId || idPrefix || 'Usuário';
      const displayName = contactName || userId;

      const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';
      let lastMsgPreview = conv.lastMessage || '';
      if (conv.lastMessageType === 'image') lastMsgPreview = '📷 Foto';
      if (conv.lastMessageType === 'file') lastMsgPreview = '📄 Arquivo';

      const isOwnMessage = conv.lastMessageSender === Auth.currentUser.uid;
      const checkIcon = isOwnMessage ? UI.getStatusIcon(conv.lastMessageStatus || 'sent') : '';

      return `
        <div class="chat-item ripple" data-conv-id="${conv.id}" data-target-id="${conv.otherUserId}" data-target-name="${displayName}" data-target-photo="${conv.otherUserPhoto}">
          <div class="avatar avatar-lg">
            ${conv.otherUserPhoto
          ? `<img src="${conv.otherUserPhoto}" alt="${displayName}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''}
            <span class="avatar-placeholder" ${conv.otherUserPhoto ? 'style="display:none"' : ''}>${initial}</span>
          </div>
          <div class="chat-item-content">
            <div class="chat-item-row">
              <span class="chat-item-name">${displayName}</span>
              <span class="chat-item-time">${time}</span>
            </div>
            <div class="chat-item-message">
              <span class="check-icon">${checkIcon}</span>
              ${UI.truncate(lastMsgPreview, 35)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Inserção Limpa no DOM
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html;
    
    // Adicionar os novos itens
    Array.from(tempContainer.children).forEach(item => {
      container.insertBefore(item, emptyState);
    });

    container.querySelectorAll('.chat-item').forEach(item => {
      const convId = item.dataset.convId;

      // Clique normal
      item.addEventListener('click', (e) => {
        // Se foi um clique longo, ignora o clique imediato após soltar
        if (this.longPressOccurred) {
          this.longPressOccurred = false;
          return;
        }

        if (this.selectionModeHome) {
          this.toggleConversationSelection(item);
        } else {
          this.openChat(convId, item.dataset.targetId, item.dataset.targetName, item.dataset.targetPhoto);
        }
      });

      // Clique longo (Segurar apertado) - Usando pointer events para maior compatibilidade
      item.addEventListener('pointerdown', (e) => {
        if (this.selectionModeHome) return;
        this.longPressOccurred = false;
        this.longPressItemTimer = setTimeout(() => {
          this.longPressOccurred = true;
          this.enterSelectionModeHome(item);
        }, 600);
      });

      const clearTimer = () => {
        if (this.longPressItemTimer) {
          clearTimeout(this.longPressItemTimer);
          this.longPressItemTimer = null;
        }
      };

      item.addEventListener('pointerup', clearTimer);
      item.addEventListener('pointerleave', clearTimer);
      item.addEventListener('pointercancel', clearTimer);
    });
  },

  enterSelectionModeHome(firstItem) {
    this.selectionModeHome = true;
    this.selectedConversations = [];

    const headerNormal = document.getElementById('chats-header-normal');
    const headerSelect = document.getElementById('chats-header-selection');
    if (headerNormal) headerNormal.classList.add('hidden');
    if (headerSelect) headerSelect.classList.remove('hidden');

    this.toggleConversationSelection(firstItem);
    if (window.navigator.vibrate) window.navigator.vibrate([40, 30, 40]);
  },

  exitSelectionModeHome() {
    this.selectionModeHome = false;
    this.selectedConversations = [];

    const headerNormal = document.getElementById('chats-header-normal');
    const headerSelect = document.getElementById('chats-header-selection');
    if (headerNormal) headerNormal.classList.remove('hidden');
    if (headerSelect) headerSelect.classList.add('hidden');

    document.querySelectorAll('.chat-item-selected').forEach(el => el.classList.remove('chat-item-selected'));
  },

  toggleConversationSelection(item) {
    const convId = item.dataset.convId;
    const index = this.selectedConversations.indexOf(convId);

    if (index > -1) {
      this.selectedConversations.splice(index, 1);
      item.classList.remove('chat-item-selected');
    } else {
      this.selectedConversations.push(convId);
      item.classList.add('chat-item-selected');
    }

    const countEl = document.getElementById('chats-selection-count');
    if (countEl) countEl.textContent = this.selectedConversations.length;

    if (this.selectedConversations.length === 0) {
      this.exitSelectionModeHome();
    }
  },

  async deleteSelectedConversations() {
    const count = this.selectedConversations.length;
    if (!confirm(`Deseja apagar as ${count} conversas selecionadas e todo o histórico?`)) return;

    UI.showToast(`Apagando ${count} conversas...`);

    try {
      const myUid = Auth.currentUser.uid;
      const now = firebase.firestore.Timestamp.now();

      for (const convId of this.selectedConversations) {
        // Em vez de deletar mensagens e o documento, marcamos para o usuário atual
        await db.collection('conversations').doc(convId).set({
          deletedBy: firebase.firestore.FieldValue.arrayUnion(myUid),
          clearedAt: {
            [myUid]: now
          }
        }, { merge: true }).catch(() => { });
      }

      UI.showToast(`${count} conversas apagadas`);
      this.exitSelectionModeHome();
    } catch (err) {
      console.error('Erro ao apagar conversas:', err);
      UI.showToast('Erro ao apagar conversas', 'error');
    }
  },

  openChat(convId, targetId, targetName, targetPhoto) {
    console.log('📱 Abrindo chat:', convId);
    this.currentChatId = convId;
    this.currentTargetId = targetId;
    this.currentTargetName = targetName || 'Usuário';
    this.messages = [];
    this.lastDateShown = null;

    // 1. Mudar a tela imediatamente
    UI.showScreen('chat', 'right');

    // 2. Limpar estado de seleção
    try {
      this.exitSelectionMode();
    } catch (e) {
      console.warn('Erro ao sair do modo de seleção:', e);
    }

    // 3. Atualizar UI do Header
    const safeName = this.currentTargetName;
    const nameEl = document.getElementById('chat-header-name');
    if (nameEl) nameEl.textContent = safeName;

    const statusEl = document.getElementById('chat-header-status');
    if (statusEl) statusEl.textContent = 'online';

    const avatarEl = document.getElementById('chat-avatar');
    if (avatarEl) {
      if (targetPhoto) {
        avatarEl.innerHTML = `<img src="${targetPhoto}" alt="${safeName}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                              <span class="avatar-placeholder" style="display:none">${safeName.charAt(0).toUpperCase()}</span>`;
      } else {
        avatarEl.innerHTML = `<span class="avatar-placeholder">${safeName.charAt(0).toUpperCase()}</span>`;
      }
    }

    document.getElementById('chat-messages').innerHTML = '';
    const msgInput = document.getElementById('message-input');
    if (msgInput) msgInput.textContent = '';

    // 4. Sincronizar participantes  (Removido)
    // A sincronização principal só ocorrerá quando a primeira mensagem for lançada,
    // evitando a exibição de chats "vazios" na página inicial da outra pessoa.

    this.subscribeToMessages(convId);
    console.log('✅ Chat inicializado com sucesso');
  },

  async subscribeToMessages(convId) {
    if (this.unsubMessages) this.unsubMessages();

    const myUid = Auth.currentUser.uid;

    // Pegar informações de limpeza da conversa
    const convDoc = await db.collection('conversations').doc(convId).get();
    const convData = convDoc.data();

    // Tenta pegar clearedAt tanto do mapa aninhado quanto da chave com ponto (retrocompatibilidade)
    let myClearedAtVal = (convData?.clearedAt && convData.clearedAt[myUid]) || convData?.[`clearedAt.${myUid}`];
    const myClearedAt = myClearedAtVal ? (myClearedAtVal.toMillis ? myClearedAtVal.toMillis() : myClearedAtVal) : 0;

    this.unsubMessages = db.collection('conversations').doc(convId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
        const container = document.getElementById('chat-messages');
        const batch = db.batch();
        let needsBatchCommit = false;
        let finalConversationStatus = null;
        let offDomContainer = document.createElement('div');

        snapshot.docChanges().forEach((change) => {
          const msg = { id: change.doc.id, ...change.doc.data() };

          // Filtros de Privacidade e Limpeza
          const isDeletedForMe = msg.deletedFor && msg.deletedFor.includes(myUid);
          const isOldMessage = msg.timestamp && (msg.timestamp.toMillis ? msg.timestamp.toMillis() : msg.timestamp) <= myClearedAt;

          if (isDeletedForMe || isOldMessage) {
            if (change.type !== 'added') {
              const el = container.querySelector(`[data-msg-id="${change.doc.id}"]`);
              if (el) el.remove();
              const idx = this.messages.findIndex(m => m.id === change.doc.id);
              if (idx > -1) this.messages.splice(idx, 1);
            }
            return;
          }

          const isOwnMsg = msg.senderId === myUid;
          const isPending = isOwnMsg && change.doc.metadata.hasPendingWrites;
          msg.status = isPending ? 'pending' : (msg.status || 'sent');

          if (change.type === 'added') {
            this.messages.push(msg);
            this.renderMessage(msg, offDomContainer);

            // Logica de "Lido": Se eu recebi e estou com o chat aberto
            if (!isOwnMsg && msg.status !== 'read') {
              batch.update(change.doc.ref, { status: 'read' });
              needsBatchCommit = true;
              finalConversationStatus = 'read';
            }
            // Logica de "Entregue": Se eu recebi mas não é lido ainda
            else if (!isOwnMsg && msg.status === 'sent') {
              batch.update(change.doc.ref, { status: 'delivered' });
              needsBatchCommit = true;
              if (finalConversationStatus !== 'read') finalConversationStatus = 'delivered';
            }

          } else if (change.type === 'removed') {
            const el = container.querySelector(`[data-msg-id="${change.doc.id}"]`);
            if (el) el.remove();
            const idx = this.messages.findIndex(m => m.id === change.doc.id);
            if (idx > -1) this.messages.splice(idx, 1);
          } else if (change.type === 'modified') {

            // Re-renderização total caso a mensagem sofra um 'Apagar para Todos'
            const el = container.querySelector(`[data-msg-id="${change.doc.id}"]`);
            if (el) {
              const oldMsgPos = this.messages.findIndex(m => m.id === change.doc.id);
              const oldMsgObj = oldMsgPos > -1 ? this.messages[oldMsgPos] : null;

              if (msg.isDeletedForEveryone && oldMsgObj && !oldMsgObj.isDeletedForEveryone) {
                if (oldMsgPos > -1) this.messages[oldMsgPos] = msg;

                const tempDiv = document.createElement('div');
                this.renderMessage(msg, tempDiv);
                const newEl = tempDiv.firstElementChild;
                el.replaceWith(newEl);
                this.bindMessageEvents(newEl, msg);
                return;
              }
            }

            // Apenas mensagens enviadas por mim devem mostrar e atualizar os "tiques" de lido/enviado
            if (isOwnMsg) {
              const statusEl = container.querySelector(`[data-msg-id="${change.doc.id}"] .bubble-status`);
              if (statusEl) {
                const newIcon = UI.getStatusIcon(msg.status);
                statusEl.innerHTML = newIcon;
              }
            }
          }
        });

        // Fast Virtual DOM append: move all pre-built nodes into the live container instantly
        if (offDomContainer.children.length > 0) {
          const fragment = document.createDocumentFragment();
          while (offDomContainer.firstChild) {
            fragment.appendChild(offDomContainer.firstChild);
          }
          container.appendChild(fragment);
        }

        if (needsBatchCommit) {
          batch.commit().catch(e => console.error('Erro no batch updates:', e));
          if (finalConversationStatus) {
            db.collection('conversations').doc(this.currentChatId)
              .update({ lastMessageStatus: finalConversationStatus })
              .catch(() => { });
          }
        }

        // Evitar travamento do thread principal durante o scroll de muitas mensagens
        requestAnimationFrame(() => {
          this.scrollToBottom();
        });
      });
  },

  renderMessage(msg, container) {
    const isOwn = msg.senderId === Auth.currentUser.uid;
    const time = UI.formatMessageTime(msg.timestamp);

    if (msg.timestamp) {
      const dateStr = UI.formatDateSeparator(msg.timestamp);
      if (dateStr !== this.lastDateShown) {
        this.lastDateShown = dateStr;
        container.insertAdjacentHTML('beforeend', `<div class="date-separator"><span>${dateStr}</span></div>`);
      }
    }

    let bubbleContent = '';

    if (msg.isDeletedForEveryone) {
      bubbleContent = `<div class="bubble-text" style="font-style:italic;color:var(--text-secondary)">${this.escapeHtml(msg.content)}</div>`;
    } else {
      switch (msg.type) {
        case 'text':
          bubbleContent = `<div class="bubble-text">${this.escapeHtml(msg.content)}</div>`;
          break;
        case 'image':
          bubbleContent = `
            <div class="bubble-media">
              <img src="${msg.mediaUrl}" alt="Foto" loading="lazy" onclick="if(!Chat.selectionMode) Media.openImageViewer('${msg.mediaUrl}')">
            </div>
            ${msg.content ? `<div class="bubble-text">${this.escapeHtml(msg.content)}</div>` : ''}
          `;
          break;
        case 'file':
          bubbleContent = `
            <div class="bubble-file">
              <div class="bubble-file-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg></div>
              <div class="bubble-file-info">
                <div class="bubble-file-name">${msg.fileName || 'Arquivo'}</div>
                <div class="bubble-file-size">${UI.formatFileSize(msg.fileSize)}</div>
              </div>
            </div>
          `;
          break;
        case 'audio':
          bubbleContent = `
            <div class="bubble-audio" data-audio-url="${msg.mediaUrl}">
              <button class="audio-player-btn" type="button">
                <svg class="play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                <svg class="pause-icon hidden" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              </button>
              <div class="audio-player-controls">
                <div class="audio-progress-container">
                  <div class="audio-progress-bar"></div>
                </div>
                <div class="audio-time-row">
                  <span class="audio-current-time">0:00</span>
                  <span class="audio-duration">0:00</span>
                </div>
              </div>
            </div>
          `;
          break;
        default:
          bubbleContent = `<div class="bubble-text">${this.escapeHtml(msg.content || '')}</div>`;
      }
    }

    const statusIcon = isOwn ? UI.getStatusIcon(msg.status || 'sent') : '';
    const html = `
      <div class="message ${isOwn ? 'message-out' : 'message-in'}" data-msg-id="${msg.id}">
        <div class="bubble ${msg._isTail !== false ? 'bubble-tail' : ''}">
          ${bubbleContent}
          <div class="bubble-meta">
            <span class="bubble-time">${time}</span>
            <span class="bubble-status">${statusIcon}</span>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);

    // Adicionar eventos de Clique Longo
    const el = container.lastElementChild;
    this.bindMessageEvents(el, msg);
  },

  bindMessageEvents(el, msg) {
    const handleStart = (e) => {
      if (this.selectionMode) return;
      this.longPressTimer = setTimeout(() => {
        this.enterSelectionMode(msg.id);
      }, 600);
    };

    const handleEnd = () => {
      clearTimeout(this.longPressTimer);
    };

    const handleClick = () => {
      if (this.selectionMode) {
        this.toggleMessageSelection(msg.id);
      } else if (msg.type === 'file') {
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(msg.fileName || '');
        if (isImage) {
          Media.openImageViewer(msg.mediaUrl);
        } else {
          // Melhor forma de "abrir" Base64: disparar o download
          const link = document.createElement('a');
          link.href = msg.mediaUrl;
          link.download = msg.fileName || 'arquivo';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else if (msg.type === 'audio') {
        AudioController.togglePlay(el.querySelector('.bubble-audio'), msg.mediaUrl);
      }
    };

    el.addEventListener('mousedown', handleStart);
    el.addEventListener('touchstart', handleStart);
    el.addEventListener('mouseup', handleEnd);
    el.addEventListener('mouseleave', handleEnd);
    el.addEventListener('touchend', handleEnd);
    el.addEventListener('click', handleClick);
  },

  enterSelectionMode(firstMsgId) {
    this.selectionMode = true;
    this.selectedMessages = [firstMsgId];

    document.getElementById('chat-header-normal').classList.add('hidden');
    document.getElementById('chat-header-selection').classList.remove('hidden');

    this.updateSelectionUI();
    if (window.navigator.vibrate) window.navigator.vibrate(50);
  },

  exitSelectionMode() {
    this.selectionMode = false;
    this.selectedMessages = [];

    const headerNormal = document.getElementById('chat-header-normal');
    const headerSelect = document.getElementById('chat-header-selection');

    if (headerNormal) headerNormal.classList.remove('hidden');
    if (headerSelect) headerSelect.classList.add('hidden');

    document.querySelectorAll('.message-selected').forEach(el => el.classList.remove('message-selected'));
  },

  toggleMessageSelection(msgId) {
    const idx = this.selectedMessages.indexOf(msgId);
    if (idx > -1) {
      if (this.selectedMessages.length === 1) {
        this.exitSelectionMode();
        return;
      }
      this.selectedMessages.splice(idx, 1);
    } else {
      this.selectedMessages.push(msgId);
    }
    this.updateSelectionUI();
  },

  updateSelectionUI() {
    const countEl = document.getElementById('selection-count');
    if (countEl) countEl.textContent = this.selectedMessages.length;

    // Atualizar classes visuais
    document.querySelectorAll('.message').forEach(el => {
      const id = el.dataset.msgId;
      if (this.selectedMessages.includes(id)) {
        el.classList.add('message-selected');
      } else {
        el.classList.remove('message-selected');
      }
    });

    // Desabilitar compartilhar para múltiplas mensagens
    const shareBtn = document.getElementById('selection-share');
    if (shareBtn) shareBtn.style.opacity = this.selectedMessages.length > 1 ? '0.3' : '1';
  },

  showDeleteModal() {
    if (this.selectedMessages.length === 0) return;

    // Verificar se todas as mensagens selecionadas foram enviadas por mim
    const allMine = this.selectedMessages.every(msgId => {
      const msg = this.messages.find(m => m.id === msgId);
      return msg && msg.senderId === Auth.currentUser.uid;
    });

    const btnEveryone = document.getElementById('btn-delete-for-everyone');
    if (btnEveryone) {
      if (allMine) {
        btnEveryone.classList.remove('hidden');
      } else {
        btnEveryone.classList.add('hidden');
      }
    }

    const modal = document.getElementById('delete-messages-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeDeleteModal() {
    const modal = document.getElementById('delete-messages-modal');
    if (modal) modal.classList.add('hidden');
  },

  async confirmDelete(type) {
    this.closeDeleteModal();
    if (this.selectedMessages.length === 0) return;

    try {
      const batch = db.batch();
      const messagesRef = db.collection('conversations').doc(this.currentChatId).collection('messages');

      this.selectedMessages.forEach(msgId => {
        if (type === 'everyone') {
          // Apagar para todos
          batch.update(messagesRef.doc(msgId), {
            isDeletedForEveryone: true,
            content: '🚫 Esta mensagem foi apagada',
            type: 'system',
            mediaUrl: firebase.firestore.FieldValue.delete(),
            fileName: firebase.firestore.FieldValue.delete()
          });
        } else {
          // Apagar para mim
          batch.update(messagesRef.doc(msgId), {
            deletedFor: firebase.firestore.FieldValue.arrayUnion(Auth.currentUser.uid)
          });
        }
      });

      // Recalcular a última mensagem para a Home
      const remainingMessages = this.messages.filter(m => {
        if (!this.selectedMessages.includes(m.id)) return true;
        return type === 'everyone';
      });

      const lastMsg = remainingMessages.length > 0 ? remainingMessages[remainingMessages.length - 1] : null;

      let lastMsgPreview = '';
      let lastMsgType = '';
      if (lastMsg) {
        if (this.selectedMessages.includes(lastMsg.id)) {
          lastMsgPreview = '🚫 Esta mensagem foi apagada';
          lastMsgType = 'system';
        } else {
          lastMsgPreview = lastMsg.isDeletedForEveryone ? '🚫 Esta mensagem foi apagada' : lastMsg.content;
          if (lastMsg.type === 'image' && !lastMsg.isDeletedForEveryone) lastMsgPreview = lastMsg.content || '📷 Foto';
          if (lastMsg.type === 'file' && !lastMsg.isDeletedForEveryone) lastMsgPreview = '📄 ' + (lastMsg.fileName || 'Arquivo');
          lastMsgType = lastMsg.type;
        }
      }

      batch.update(db.collection('conversations').doc(this.currentChatId), {
        lastMessage: lastMsgPreview || '',
        lastMessageTime: lastMsg ? lastMsg.timestamp : firebase.firestore.FieldValue.serverTimestamp(),
        lastMessageType: lastMsgType || '',
        lastMessageSender: lastMsg ? lastMsg.senderId : '',
        lastMessageStatus: lastMsg ? lastMsg.status : ''
      });

      await batch.commit();
      UI.showToast('Mensagens apagadas');
      this.exitSelectionMode();
    } catch (err) {
      console.error('Erro ao apagar mensagens:', err);
      UI.showToast('Erro ao apagar mensagens', 'error');
    }
  },

  async shareSelected() {
    if (this.selectedMessages.length !== 1) return;

    const msgId = this.selectedMessages[0];
    const msg = this.messages.find(m => m.id === msgId);
    if (!msg) return;

    const shareData = {
      title: 'ZapChat',
      text: msg.content || 'Confira este arquivo no ZapChat',
      url: msg.mediaUrl || window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copiar para área de transferência
        await navigator.clipboard.writeText(msg.content || msg.mediaUrl);
        UI.showToast('Link copiado!');
      }
      this.exitSelectionMode();
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
    }
  },

  refreshConversations() {
    if (!this.conversations || this.conversations.length === 0) return;

    // Atualiza nomes na lista com base na agenda (Contacts)
    this.conversations = this.conversations.map(conv => {
      const contactName = Contacts.getContactName(conv.otherUserId);
      const otherUser = this.userCache[conv.otherUserId] || {};
      const userId = otherUser.searchId || (otherUser.email ? otherUser.email.split('@')[0].toLowerCase() : 'Usuário');

      const newName = contactName || userId;

      // Se for a conversa aberta agora, atualiza o nome no cabeçalho também
      if (conv.otherUserId === this.currentTargetId) {
        this.currentTargetName = newName;
        const nameEl = document.getElementById('chat-header-name');
        if (nameEl) nameEl.textContent = newName;
      }

      return {
        ...conv,
        otherUserName: newName
      };
    });

    this.renderConversations();
  },

  handleSend() {
    const input = document.getElementById('message-input');
    const text = input.textContent.trim();
    if (!text || !this.currentChatId) return;
    input.textContent = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
    this.sendMessage('text', text);
  },

  async sendMessage(type, content, mediaUrl = '', fileName = '', fileSize = 0) {
    if (!this.currentChatId || !Auth.currentUser) return;

    const message = {
      senderId: Auth.currentUser.uid,
      type: type,
      content: content,
      mediaUrl: mediaUrl,
      fileName: fileName,
      fileSize: fileSize,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'sent'
    };

    try {
      await db.collection('conversations').doc(this.currentChatId).collection('messages').add(message);

      let lastMsgPreview = content;
      if (type === 'image') lastMsgPreview = content || '📷 Foto';
      if (type === 'file') lastMsgPreview = '📄 ' + (fileName || 'Arquivo');

      await db.collection('conversations').doc(this.currentChatId).set({
        participants: firebase.firestore.FieldValue.arrayUnion(Auth.currentUser.uid, this.currentTargetId),
        lastMessage: lastMsgPreview,
        lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessageType: type,
        lastMessageSender: Auth.currentUser.uid,
        lastMessageStatus: 'sent',
        // Remover do array de deletados para ambos (especialmente destinatário) para o chat "voltar"
        deletedBy: firebase.firestore.FieldValue.arrayRemove(Auth.currentUser.uid, this.currentTargetId)
      }, { merge: true });
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      if (err.code === 'permission-denied') {
        UI.showToast('Erro de permissão no Firestore. Verifique as Regras de Segurança.', 'error', 6000);
      } else {
        UI.showToast('Erro ao enviar mensagem', 'error');
      }
    }
  },

  closeChat() {
    if (this.unsubMessages) {
      this.unsubMessages();
      this.unsubMessages = null;
    }
    this.currentChatId = null;
    this.currentTargetId = null;
    this.messages = [];
    EmojiPicker.close();
    Media.closeAttachMenu();
    UI.showScreen('chats', 'left');
  },

  openContactProfile() {
    if (!this.currentTargetId) return;

    const cachedUser = this.userCache[this.currentTargetId];

    // 1. Initial preview (from current chat state)
    document.getElementById('cprofile-name').textContent = this.currentTargetName || 'Contato';
    document.getElementById('cprofile-id').textContent = this.currentTargetId.substring(0, 8).toUpperCase();

    const currentAvatar = document.querySelector('#chat-avatar').innerHTML;
    document.getElementById('cprofile-avatar').innerHTML = currentAvatar;

    const currentStatus = document.getElementById('chat-header-status').textContent;
    document.getElementById('cprofile-status').textContent = currentStatus || 'Indisponível';

    // 2. Clear previous email before fetch
    document.getElementById('cprofile-email-field').textContent = 'Carregando...';

    // Toggle e Config do botão de Adicionar / Editar
    const addBtn = document.getElementById('cprofile-add-final-btn');
    const editBtn = document.getElementById('cprofile-edit-btn');
    const isContact = Contacts.isContact(this.currentTargetId);

    if (addBtn) {
      if (isContact) {
        addBtn.classList.add('hidden');
      } else {
        addBtn.classList.remove('hidden');
        addBtn.onclick = () => {
          const name = document.getElementById('cprofile-name').textContent;
          const email = document.getElementById('cprofile-email-field').textContent;
          const targetEmail = (email && email !== 'Carregando...') ? email : '';
          const targetName = (name && name !== 'Contato') ? name : '';
          UI.openAddContactModal(targetEmail, targetName);
        };
      }
    }

    if (editBtn) {
      if (isContact) {
        editBtn.classList.remove('hidden');
        editBtn.onclick = () => {
          const name = document.getElementById('cprofile-name').textContent;
          const email = document.getElementById('cprofile-email-field').textContent;
          const targetEmail = (email && email !== 'Carregando...') ? email : '';
          // Quando editando, passamos o uid para o modal saber que é uma edição
          UI.openAddContactModal(targetEmail, name, true);
        };
      } else {
        editBtn.classList.add('hidden');
      }
    }

    // 4. Async Fetch REAL data from global Users collection
    db.collection('users').doc(this.currentTargetId).get().then(doc => {
      if (doc.exists) {
        const userData = doc.data();
        this.userCache[this.currentTargetId] = userData;

        // Update UI with real data
        document.getElementById('cprofile-name').textContent = userData.displayName || userData.email.split('@')[0] || 'Usuário';
        document.getElementById('cprofile-email-field').textContent = userData.email || 'Não informado';
        document.getElementById('cprofile-id').textContent = userData.email ? userData.email.split('@')[0].toLowerCase() : this.currentTargetId.substring(0, 8).toUpperCase();
        document.getElementById('cprofile-status').textContent = userData.status || 'Disponível';

        if (userData.photoURL) {
          document.getElementById('cprofile-avatar').innerHTML = `<img src="${userData.photoURL}" alt="Avatar">`;
        }
      } else {
        document.getElementById('cprofile-email-field').textContent = 'Usuário do ZapChat';
      }
    }).catch(err => {
      console.error('Erro ao buscar perfil global:', err);
      document.getElementById('cprofile-email-field').textContent = 'Erro ao carregar';
    });

    UI.showScreen('contactProfile', 'right');
    history.pushState({ screen: 'contactProfile' }, '');
  },

  scrollToBottom() {
    const container = document.getElementById('chat-messages');
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  },

  cleanup() {
    if (this.unsubConversations) {
      this.unsubConversations();
      this.unsubConversations = null;
    }
    if (this.unsubMessages) {
      this.unsubMessages();
      this.unsubMessages = null;
    }
    this.conversations = [];
    this.messages = [];
    this.currentChatId = null;
    this.userCache = {};
    AudioController.stop();
  }
};

// ── Audio Player Controller ──
const AudioController = {
  currentAudio: null,
  currentBubble: null,
  updateInterval: null,

  togglePlay(bubble, url) {
    if (this.currentBubble === bubble) {
      if (this.currentAudio.paused) {
        this.currentAudio.play();
        this.updateUI(true);
      } else {
        this.currentAudio.pause();
        this.updateUI(false);
      }
      return;
    }

    this.stop();

    this.currentBubble = bubble;
    this.currentAudio = new Audio(url);
    
    this.currentAudio.onloadedmetadata = () => {
      bubble.querySelector('.audio-duration').textContent = this.formatTime(this.currentAudio.duration);
    };

    this.currentAudio.onended = () => this.stop();

    this.currentAudio.play();
    this.updateUI(true);
    
    this.updateInterval = setInterval(() => {
      const progress = (this.currentAudio.currentTime / this.currentAudio.duration) * 100;
      bubble.querySelector('.audio-progress-bar').style.width = `${progress}%`;
      bubble.querySelector('.audio-current-time').textContent = this.formatTime(this.currentAudio.currentTime);
    }, 100);
  },

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (this.currentBubble) {
      this.updateUI(false);
      this.currentBubble.querySelector('.audio-progress-bar').style.width = '0%';
      this.currentBubble.querySelector('.audio-current-time').textContent = '0:00';
      this.currentBubble = null;
    }
    clearInterval(this.updateInterval);
  },

  updateUI(isPlaying) {
    if (!this.currentBubble) return;
    const playBtn = this.currentBubble.querySelector('.play-icon');
    const pauseBtn = this.currentBubble.querySelector('.pause-icon');
    if (isPlaying) {
      playBtn.classList.add('hidden');
      pauseBtn.classList.remove('hidden');
    } else {
      playBtn.classList.remove('hidden');
      pauseBtn.classList.add('hidden');
    }
  },

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }
};
