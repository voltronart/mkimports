// Conexão com o Firebase da Mk Imports.
// Este arquivo é compartilhado pelo painel do ADM e, mais adiante, pela vitrine.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCXoFU5f2pwhr1ZQe8lSDIuPFVSfxQS1-c",
  authDomain: "mkimports-83111.firebaseapp.com",
  projectId: "mkimports-83111",
  storageBucket: "mkimports-83111.firebasestorage.app",
  messagingSenderId: "142507897977",
  appId: "1:142507897977:web:bc013ca4c050fc922f10a8"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);