# 🔧 Como Configurar o Firebase para o ZapChat

## Passo 1: Criar projeto Firebase

1. Acesse **[Firebase Console](https://console.firebase.google.com/)**
2. Clique em **"Adicionar projeto"**
3. Dê um nome ao projeto (ex: `zapchat`)
4. Desmarque o Google Analytics se quiser (não é necessário)
5. Clique em **"Criar projeto"**

## Passo 2: Registrar app web

1. Na tela inicial do projeto, clique no ícone **`</>`** (Web)
2. Dê um apelido ao app (ex: `zapchat-web`)
3. **NÃO** marque Firebase Hosting (não é necessário agora)
4. Clique em **"Registrar app"**
5. Copie o bloco `firebaseConfig` que aparece:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCBHHCSPMHb1Y3rFrH2PtturRq52cxGdk0",
  authDomain: "zapchat-49733.firebaseapp.com",
  projectId: "zapchat-49733",
  storageBucket: "zapchat-49733.firebasestorage.app",
  messagingSenderId: "426071360516",
  appId: "1:426071360516:web:aef3aca2d518447da96151"
};
```

6. Cole essas credenciais no arquivo `js/firebase-config.js` substituindo os placeholders

## Passo 3: Ativar Autenticação Google

1. No Firebase Console, vá em **Authentication** (menu lateral)
2. Clique na aba **"Sign-in method"**
3. Clique em **"Google"**
4. Ative o toggle **"Ativar"**
5. Selecione um email de suporte (seu email)
6. Clique em **"Salvar"**

## Passo 4: Criar Firestore Database

1. No menu lateral, vá em **Firestore Database**
2. Clique em **"Criar banco de dados"**
3. Selecione **"Iniciar no modo de teste"** (para desenvolvimento)
4. Escolha a região mais próxima (ex: `southamerica-east1` para Brasil)
5. Clique em **"Ativar"**

### Regras de segurança (para produção futura)

No Firestore, vá em **Regras** e cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Contacts
    match /contacts/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Conversas e Mensagens
    match /conversations/{convId} {
      // Regra simplificada para garantir funcionamento imediato
      allow read, write: if request.auth != null;
      
      // Mensagens dentro da conversa (subcoleção)
      match /messages/{msgId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

## Passo 5: Rodar o app

O app é um site estático (HTML/CSS/JS), então basta servir os arquivos:

### Opção 1: Live Server (VS Code)
1. Instale a extensão "Live Server" no VS Code
2. Clique com botão direito no `index.html`
3. Selecione **"Open with Live Server"**

### Opção 2: npx serve
```bash
npx -y serve .
```

### Opção 3: Python
```bash
python -m http.server 8080
```

Depois abra no navegador: `http://localhost:8080` (ou a porta exibida)

## 📱 Usar no celular

1. Certifique-se que PC e celular estão na mesma rede Wi-Fi
2. Descubra seu IP local (ex: `ipconfig` no Windows)
3. No celular, abra: `http://SEU_IP:PORTA`
4. No navegador do celular, toque em **"Adicionar à tela inicial"**
5. O app será instalado como PWA!

## ⚠️ Importante

- O modo de teste do Firestore expira em **30 dias**. Atualize as regras de segurança antes disso.
- Imagens são comprimidas e armazenadas como Base64 no Firestore (sem custo de Storage).
- Para login Google funcionar em domínios além do localhost, adicione o domínio em **Authentication > Settings > Authorized domains**
