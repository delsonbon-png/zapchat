// ======================================
// ZapChat — Media Handling (Base64 no Firestore, sem Storage)
// ======================================
// Imagens são comprimidas e convertidas para Base64
// Arquivos são convertidos para Base64 data URL
// Tudo armazenado direto no Firestore (sem custo)

const Media = {
  pendingFile: null,
  pendingType: null, // 'image', 'file', 'audio'
  pendingDataUrl: null, // Base64 data URL
  
  // Audio Recording
  mediaRecorder: null,
  audioChunks: [],
  recordingInterval: null,
  recordingStartTime: 0,
  isRecording: false,
  audioStream: null,

  // Limites
  // Limites
  MAX_IMAGE_SIZE: 800, // max width/height em pixels (para comprimir)
  MAX_IMAGE_QUALITY: 0.6, // qualidade JPEG (0-1)
  MAX_FILE_SIZE_KB: 700, // limite de volta para Firestore (~1MB doc limit)

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Attach button toggle
    document.getElementById('attach-btn').addEventListener('click', () => {
      this.toggleAttachMenu();
    });

    // Attach options
    document.getElementById('attach-photo').addEventListener('click', () => {
      document.getElementById('file-image').click();
      this.closeAttachMenu();
    });

    document.getElementById('attach-camera').addEventListener('click', () => {
      document.getElementById('file-camera').click();
      this.closeAttachMenu();
    });

    document.getElementById('attach-document').addEventListener('click', () => {
      document.getElementById('file-document').click();
      this.closeAttachMenu();
    });

    // File input changes
    document.getElementById('file-image').addEventListener('change', (e) => {
      if (e.target.files[0]) this.handleImageSelect(e.target.files[0]);
      e.target.value = '';
    });

    document.getElementById('file-camera').addEventListener('change', (e) => {
      if (e.target.files[0]) this.handleImageSelect(e.target.files[0]);
      e.target.value = '';
    });

    document.getElementById('file-document').addEventListener('change', (e) => {
      if (e.target.files[0]) this.handleFileSelect(e.target.files[0]);
      e.target.value = '';
    });

    // Media preview
    document.getElementById('media-preview-close').addEventListener('click', () => {
      this.closePreview();
    });

    document.getElementById('media-send-btn').addEventListener('click', () => {
      this.sendPendingMedia();
    });

    // Image viewer
    document.getElementById('image-viewer-close').addEventListener('click', () => {
      this.closeImageViewer();
    });

    // Enter on caption
    document.getElementById('media-caption').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.sendPendingMedia();
      }
    });

    // Mic button for Voice Messages
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) {
      micBtn.addEventListener('mousedown', () => this.startRecording());
      micBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.startRecording();
      });

      window.addEventListener('mouseup', () => {
        if (this.isRecording) this.stopRecording();
      });
      window.addEventListener('touchend', () => {
        if (this.isRecording) this.stopRecording();
      });
    }

    const cancelRecBtn = document.getElementById('cancel-recording-btn');
    if (cancelRecBtn) {
      cancelRecBtn.addEventListener('click', () => this.cancelRecording());
    }

    // Toggle Send/Mic button based on input
    const msgInput = document.getElementById('message-input');
    if (msgInput) {
      msgInput.addEventListener('input', () => {
        const hasText = msgInput.textContent.trim().length > 0;
        document.getElementById('send-btn').classList.toggle('hidden', !hasText);
        document.getElementById('mic-btn').classList.toggle('hidden', hasText);
      });
    }
  },

  toggleAttachMenu() {
    const menu = document.getElementById('attach-menu');
    menu.classList.toggle('hidden');
    EmojiPicker.close();
  },

  closeAttachMenu() {
    document.getElementById('attach-menu').classList.add('hidden');
  },

  closePreview() {
    document.getElementById('media-preview').classList.add('hidden');
    document.getElementById('media-preview-img').src = '';
    document.getElementById('media-caption').value = '';
    this.pendingFile = null;
    this.pendingType = null;
  },

  openImageViewer(url) {
    const viewer = document.getElementById('image-viewer');
    const img = document.getElementById('image-viewer-img');
    if (viewer && img) {
      img.src = url;
      viewer.classList.remove('hidden');
    }
  },

  closeImageViewer() {
    const viewer = document.getElementById('image-viewer');
    if (viewer) {
      viewer.classList.add('hidden');
      document.getElementById('image-viewer-img').src = '';
    }
  },

  // ── Comprimir imagem usando Canvas ──
  compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Redimensionar se necessário
          if (width > this.MAX_IMAGE_SIZE || height > this.MAX_IMAGE_SIZE) {
            if (width > height) {
              height = Math.round((height * this.MAX_IMAGE_SIZE) / width);
              width = this.MAX_IMAGE_SIZE;
            } else {
              width = Math.round((width * this.MAX_IMAGE_SIZE) / height);
              height = this.MAX_IMAGE_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Converter para JPEG comprimido (Base64)
          const dataUrl = canvas.toDataURL('image/jpeg', this.MAX_IMAGE_QUALITY);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  handleImageSelect(file) {
    if (!file.type.startsWith('image/')) {
      UI.showToast('Selecione um arquivo de imagem', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      UI.showToast('Imagem muito grande (máx 10MB)', 'error');
      return;
    }

    this.pendingFile = file;
    this.pendingType = 'image';

    // Show preview (original quality for preview)
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('media-preview-img').src = e.target.result;
      document.getElementById('media-preview').classList.remove('hidden');
      document.getElementById('media-caption').value = '';
      document.getElementById('media-caption').focus();
    };
    reader.readAsDataURL(file);
  },

  handleFileSelect(file) {
    // Limite original de 700KB para Firestore
    if (file.size > this.MAX_FILE_SIZE_KB * 1024) {
      UI.showToast(`Arquivo muito grande (máx ${this.MAX_FILE_SIZE_KB}KB)`, 'error');
      return;
    }

    this.pendingFile = file;
    this.pendingType = 'file';

    // Send directly without preview
    this.sendFile(file);
  },

  async sendPendingMedia() {
    if (!this.pendingFile || !Chat.currentChatId) return;

    const caption = document.getElementById('media-caption').value.trim();
    const file = this.pendingFile;

    this.closePreview();
    UI.showToast('Enviando imagem...');

    try {
      // 1. Comprimir imagem para Base64
      const dataUrl = await this.compressImage(file);

      // 2. Verificar tamanho do Base64 (limite Firestore)
      const sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
      if (sizeKB > 900) {
        UI.showToast('Imagem muito grande para o modo simplificado. Tente uma menor.', 'error');
        return;
      }

      // 3. Registrar no Firestore
      await Chat.sendMessage('image', caption, dataUrl, file.name);
      UI.showToast('Imagem enviada!');
    } catch (err) {
      console.error('Erro ao enviar imagem:', err);
      UI.showToast('Erro ao enviar imagem. Verifique as ferramentas de rede.', 'error');
    }
  },

  async sendFile(file) {
    if (!Chat.currentChatId) return;

    UI.showToast('Enviando arquivo...');

    try {
      // 1. Converter para Base64
      const dataUrl = await this.fileToBase64(file);

      // 2. Verificar tamanho
      const sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
      if (sizeKB > 900) {
        UI.showToast('Arquivo muito grande para o modo simplificado (máx 700KB).', 'error');
        return;
      }

      // 3. Registrar no Firestore
      await Chat.sendMessage('file', file.name, dataUrl, file.name, file.size);
      UI.showToast('Arquivo enviado!');
    } catch (err) {
      console.error('Erro ao enviar arquivo:', err);
      UI.showToast('Erro no envio do arquivo.', 'error');
    }
  },

  // ── Audio Recording Logic ──
  async startRecording() {
    if (this.isRecording) return;

    // Verificar se o contexto é seguro (HTTPS ou localhost)
    if (!window.isSecureContext) {
      UI.showToast('Microfone requer HTTPS. No celular, use https:// no endereço.', 'error');
      console.warn('getUserMedia requer contexto seguro (HTTPS)');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      UI.showToast('Seu navegador não suporta gravação de áudio', 'error');
      return;
    }
    
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.audioStream, mimeType ? { mimeType } : undefined);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => this.handleAudioStop();

      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      
      // UI Updates
      document.getElementById('recording-bar').classList.remove('hidden');
      document.getElementById('mic-btn').classList.add('recording');
      
      this.recordingInterval = setInterval(() => this.updateRecordingTimer(), 1000);
      
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      console.log('🎤 Gravação iniciada');
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      if (err.name === 'NotAllowedError') {
        UI.showToast('Permissão do microfone negada. Verifique as configurações do navegador.', 'error');
      } else if (err.name === 'NotFoundError') {
        UI.showToast('Nenhum microfone encontrado', 'error');
      } else {
        UI.showToast('Erro ao acessar microfone: ' + err.message, 'error');
      }
    }
  },

  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.finishRecordingUI();
  },

  cancelRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.audioChunks = []; // Clear chunks so it's not sent
    this.finishRecordingUI();
    UI.showToast('Gravação cancelada');
  },

  finishRecordingUI() {
    clearInterval(this.recordingInterval);
    document.getElementById('recording-bar').classList.add('hidden');
    document.getElementById('mic-btn').classList.remove('recording');
    document.getElementById('recording-timer').textContent = '00:00';
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
    }
  },

  updateRecordingTimer() {
    const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('recording-timer').textContent = `${mins}:${secs}`;
    
    // Auto-stop at 1 minute (limit for Firestore doc size)
    if (elapsed >= 60) this.stopRecording();
  },

  async handleAudioStop() {
    if (this.audioChunks.length === 0) return;

    const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });
    this.audioChunks = [];

    UI.showToast('Processando áudio...');
    
    try {
      const dataUrl = await this.fileToBase64(audioBlob);
      await Chat.sendMessage('audio', 'Mensagem de voz', dataUrl, 'audio.ogg', audioBlob.size);
      UI.showToast('Áudio enviado!');
    } catch (err) {
      console.error('Erro ao processar áudio:', err);
      UI.showToast('Erro ao enviar áudio', 'error');
    }
  },

  getSupportedMimeType() {
    const types = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  }
};
