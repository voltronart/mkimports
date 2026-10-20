// Lógica do painel do ADM: login, troca de abas e teste de conexão.

import { auth, db } from "./firebase-config.js";
import { iniciarCategorias } from "./categorias.js";
import { carregarPecas } from "./pecas.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, limit, query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const telaLogin = document.getElementById("tela-login");
const telaPainel = document.getElementById("tela-painel");
const formLogin = document.getElementById("form-login");
const erroLogin = document.getElementById("login-erro");
const botaoEntrar = document.getElementById("botao-entrar");
const statusConexao = document.getElementById("status-conexao");

// Mensagens de erro de login em português simples
function traduzirErro(codigo) {
  const erros = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-email": "Esse e-mail não parece válido.",
    "auth/user-disabled": "Esse usuário está desativado.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
    "auth/network-request-failed": "Sem conexão com a internet. Verifique e tente de novo.",
    "auth/operation-not-supported-in-this-environment":
      "Abra o painel por um servidor (http://localhost), não direto pelo arquivo."
  };
  return erros[codigo] || "Não foi possível entrar. Código: " + codigo;
}

// Login
formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  erroLogin.textContent = "";
  botaoEntrar.disabled = true;
  botaoEntrar.textContent = "Entrando…";
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("login-email").value.trim(),
      document.getElementById("login-senha").value
    );
  } catch (err) {
    erroLogin.textContent = traduzirErro(err.code);
  } finally {
    botaoEntrar.disabled = false;
    botaoEntrar.textContent = "Entrar";
  }
});

// Sair
document.getElementById("botao-sair").addEventListener("click", () => signOut(auth));

// Troca de abas
document.querySelectorAll("nav.abas button").forEach((botao) => {
  botao.addEventListener("click", () => {
    document.querySelectorAll("nav.abas button").forEach((b) =>
      b.setAttribute("aria-selected", String(b === botao))
    );
    document.getElementById("aba-categorias").hidden = botao.dataset.aba !== "categorias";
    document.getElementById("aba-pecas").hidden = botao.dataset.aba !== "pecas";
    if (botao.dataset.aba === "pecas") carregarPecas();
  });
});

// Teste de conexão com o Firestore
async function testarConexao() {
  statusConexao.className = "status";
  statusConexao.textContent = "Testando conexão com o banco de dados…";
  try {
    await getDocs(query(collection(db, "categorias"), limit(1)));
    statusConexao.className = "status ok";
    statusConexao.textContent = "Conectado ao banco de dados.";
  } catch (err) {
    statusConexao.className = "status falha";
    statusConexao.textContent = err.code === "permission-denied"
      ? "O banco respondeu, mas bloqueou a leitura. Falta publicar as regras de segurança (arquivo backend/firestore.rules)."
      : "Não foi possível conectar ao banco. Confira se o Firestore foi criado. Detalhe: " + (err.code || err.message);
  }
}

// Mostra login ou painel conforme o usuário estar logado
onAuthStateChanged(auth, (usuario) => {
  document.getElementById("carregando").hidden = true;
  if (usuario) {
    telaLogin.hidden = true;
    telaPainel.hidden = false;
    document.getElementById("usuario-email").textContent = usuario.email;
    testarConexao();
    iniciarCategorias();
  } else {
    telaPainel.hidden = true;
    telaLogin.hidden = false;
    formLogin.reset();
  }
});