// ======================================
// ZapChat — Firebase Configuration
// ======================================
// Usa apenas Authentication + Firestore (100% gratuito no plano Spark)
// Imagens e arquivos são armazenados como Base64 no Firestore

const firebaseConfig = {
  apiKey: "AIzaSyCBHHCSPMHb1Y3rFrH2PtturRq52cxGdk0",
  authDomain: "zapchat-49733.firebaseapp.com",
  projectId: "zapchat-49733",
  storageBucket: "zapchat-49733.firebasestorage.app",
  messagingSenderId: "426071360516",
  appId: "1:426071360516:web:aef3aca2d518447da96151"
};

// Initialize Firebase (sem Storage)
let app, auth, db;

try {
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
    console.log('🔥 Firebase inicializado com sucesso');
  } else {
    app = firebase.app();
    console.log('🔥 Firebase já estava inicializado');
  }
} catch (e) {
  console.error('❌ Erro ao inicializar o Firebase:', e.message);
}

// Inicializar serviços (Compat API)
try {
  auth = firebase.auth();
  db = firebase.firestore();
} catch (e) {
  console.error('❌ Erro ao inicializar serviços do Firebase:', e.message);
}

// Persistência offline (não bloqueia se falhar)
try {
  db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    console.warn('Persistência offline:', err.code || err.message);
  });
} catch (e) {
  console.warn('Persistência não suportada');
}

// Utility: gerar ID a partir do email
function generateUserIdFromEmail(email) {
  return email.replace(/[@.]/g, '_').toLowerCase();
}

console.log('🔥 Firebase inicializado');
