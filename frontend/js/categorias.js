// Etapa 3: cadastro de categorias e subcategorias no painel do ADM.
//
// Como os dados ficam no Firestore:
//   categorias:    { nome, ordem, ativa }
//   subcategorias: { nome, categoriaId, ordem }

import { db } from "./firebase-config.js";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Lista inicial da loja (botão "Importar lista inicial")
const CATALOGO_INICIAL = [
  { nome: "Camisetas", subs: ["30.1 Importada", "Gola Polo Importada", "Gola Polo Piquet", "Malha Pima", "Malha Chinesa", "Gola Polo Dry-Fit", "Tricor", "Texturizada"] },
  { nome: "Shorts",    subs: ["Sarja", "Cargo", "Linho", "Elastano", "Jeans", "Jogador"] },
  { nome: "Calça",     subs: ["Jogador", "Tradicional"] },
  { nome: "Calçados",  subs: ["Tênis", "Chinelo", "Sandália"] },
  { nome: "Lupas",     subs: ["Juliet"] },
  { nome: "Bonés",     subs: ["Premium", "Importado"] },
  { nome: "Outros",    subs: ["Cueca", "Carteira"] },
  { nome: "Kits",      subs: ["Nike Academy"] }
];

const raiz = document.getElementById("lista-categorias");
const avisoEl = document.getElementById("categorias-aviso");
const areaImportar = document.getElementById("area-importar");
const formCategoria = document.getElementById("form-categoria");
const inputCategoria = document.getElementById("categoria-nome");

let categorias = [];
let subcategorias = [];
let iniciado = false;

/* ---------- utilitários ---------- */

function aviso(texto, tipo = "") {
  avisoEl.textContent = texto;
  avisoEl.className = "aviso " + tipo;
  avisoEl.hidden = !texto;
}

// Cria elementos sem usar innerHTML (os nomes digitados nunca viram HTML)
function el(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "classe") e.className = v;
    else if (k === "texto") e.textContent = v;
    else if (k === "dados") Object.assign(e.dataset, v);
    else e.setAttribute(k, v);
  }
  filhos.forEach((f) => e.append(f));
  return e;
}

function botao(texto, acao, dados = {}, extra = "") {
  return el("button", {
    type: "button",
    classe: "botao pequeno secundario " + extra,
    texto,
    dados: { acao, ...dados }
  });
}

const mesmoNome = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const proximaOrdem = (lista) => lista.reduce((m, x) => Math.max(m, x.ordem ?? 0), 0) + 1;
const porOrdem = (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0);

/* ---------- carregar e desenhar ---------- */

async function carregar() {
  try {
    const [c, s] = await Promise.all([
      getDocs(collection(db, "categorias")),
      getDocs(collection(db, "subcategorias"))
    ]);
    categorias = c.docs.map((d) => ({ id: d.id, ...d.data() })).sort(porOrdem);
    subcategorias = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(porOrdem);
    render();
  } catch (err) {
    aviso("Não foi possível carregar as categorias. Verifique as regras de segurança e a conexão. Detalhe: " + (err.code || err.message), "erro");
  }
}

function render() {
  raiz.replaceChildren();
  areaImportar.hidden = categorias.length > 0;

  if (!categorias.length) {
    raiz.append(el("p", { classe: "vazio", texto: "Nenhuma categoria ainda. Crie a primeira no campo acima ou importe a lista inicial da loja." }));
    return;
  }

  categorias.forEach((cat, i) => {
    const subs = subcategorias.filter((s) => s.categoriaId === cat.id);

    const lista = el("ul", { classe: "lista-subs" });
    if (!subs.length) lista.append(el("li", { classe: "vazio", texto: "Sem subcategorias ainda." }));
    subs.forEach((s) => {
      lista.append(el("li", {},
        el("span", { texto: s.nome }),
        el("span", { classe: "acoes" },
          botao("Renomear", "renomear-sub", { id: s.id }),
          botao("Excluir", "excluir-sub", { id: s.id }, "perigo")
        )
      ));
    });

    const subir = botao("Subir", "subir", { id: cat.id });
    const descer = botao("Descer", "descer", { id: cat.id });
    subir.disabled = i === 0;
    descer.disabled = i === categorias.length - 1;

    const formSub = el("form", { classe: "form-sub", dados: { catId: cat.id } },
      el("input", { type: "text", maxlength: "60", required: "", placeholder: "Nova subcategoria", "aria-label": "Nome da nova subcategoria em " + cat.nome }),
      el("button", { type: "submit", classe: "botao pequeno", texto: "Adicionar" })
    );

    raiz.append(el("article", { classe: "cat-card" },
      el("div", { classe: "cat-topo" },
        el("h3", { texto: cat.nome }),
        el("div", { classe: "acoes" },
          subir, descer,
          botao("Renomear", "renomear-cat", { id: cat.id }),
          botao("Excluir", "excluir-cat", { id: cat.id }, "perigo")
        )
      ),
      lista,
      formSub
    ));
  });
}

/* ---------- ações ---------- */

async function adicionarCategoria(nome) {
  nome = nome.trim();
  if (!nome) return;
  if (categorias.some((c) => mesmoNome(c.nome, nome))) {
    return aviso(`Já existe uma categoria chamada "${nome}".`, "erro");
  }
  await addDoc(collection(db, "categorias"), { nome, ordem: proximaOrdem(categorias), ativa: true });
  aviso(`Categoria "${nome}" adicionada.`, "ok");
}

async function adicionarSub(catId, nome) {
  nome = nome.trim();
  if (!nome) return;
  const irmas = subcategorias.filter((s) => s.categoriaId === catId);
  if (irmas.some((s) => mesmoNome(s.nome, nome))) {
    return aviso(`Essa categoria já tem uma subcategoria chamada "${nome}".`, "erro");
  }
  await addDoc(collection(db, "subcategorias"), { nome, categoriaId: catId, ordem: proximaOrdem(irmas) });
  aviso(`Subcategoria "${nome}" adicionada.`, "ok");
}

async function renomear(colecao, item, lista, rotulo) {
  const novo = prompt(`Novo nome da ${rotulo}:`, item.nome);
  if (novo === null) return;
  const nome = novo.trim();
  if (!nome || nome === item.nome) return;
  if (lista.some((x) => x.id !== item.id && mesmoNome(x.nome, nome))) {
    return aviso(`Já existe uma ${rotulo} chamada "${nome}".`, "erro");
  }
  await updateDoc(doc(db, colecao, item.id), { nome });
  aviso(`Renomeada para "${nome}".`, "ok");
}

// Quantas peças usam essa categoria/subcategoria (campo = "categoriaId" ou "subcategoriaId")
async function contarPecas(campo, id) {
  const snap = await getDocs(query(collection(db, "pecas"), where(campo, "==", id)));
  return snap.size;
}

async function excluirCategoria(cat) {
  const emUso = await contarPecas("categoriaId", cat.id);
  if (emUso) {
    return aviso(`Não dá para excluir "${cat.nome}": ${emUso} peça(s) usam essa categoria. Mude ou exclua essas peças antes.`, "erro");
  }
  const subs = subcategorias.filter((s) => s.categoriaId === cat.id);
  const extra = subs.length ? ` Isso também exclui as ${subs.length} subcategorias dela.` : "";
  if (!confirm(`Excluir a categoria "${cat.nome}"?${extra}`)) return;
  const batch = writeBatch(db);
  subs.forEach((s) => batch.delete(doc(db, "subcategorias", s.id)));
  batch.delete(doc(db, "categorias", cat.id));
  await batch.commit();
  aviso(`Categoria "${cat.nome}" excluída.`, "ok");
}

async function excluirSub(sub) {
  const emUso = await contarPecas("subcategoriaId", sub.id);
  if (emUso) {
    return aviso(`Não dá para excluir "${sub.nome}": ${emUso} peça(s) usam essa subcategoria. Mude ou exclua essas peças antes.`, "erro");
  }
  if (!confirm(`Excluir a subcategoria "${sub.nome}"?`)) return;
  await deleteDoc(doc(db, "subcategorias", sub.id));
  aviso(`Subcategoria "${sub.nome}" excluída.`, "ok");
}

async function mover(cat, direcao) {
  const i = categorias.findIndex((c) => c.id === cat.id);
  const vizinha = categorias[i + direcao];
  if (!vizinha) return;
  const batch = writeBatch(db);
  batch.update(doc(db, "categorias", cat.id), { ordem: vizinha.ordem });
  batch.update(doc(db, "categorias", vizinha.id), { ordem: cat.ordem });
  await batch.commit();
}

async function importarListaInicial() {
  if (categorias.length) return;
  if (!confirm("Importar a lista inicial da loja (8 categorias e 25 subcategorias)?")) return;
  const batch = writeBatch(db);
  CATALOGO_INICIAL.forEach((c, i) => {
    const catRef = doc(collection(db, "categorias"));
    batch.set(catRef, { nome: c.nome, ordem: i + 1, ativa: true });
    c.subs.forEach((nome, j) => {
      const subRef = doc(collection(db, "subcategorias"));
      batch.set(subRef, { nome, categoriaId: catRef.id, ordem: j + 1 });
    });
  });
  await batch.commit();
  aviso("Lista inicial importada.", "ok");
}

// Executa uma ação, mostra erro amigável se falhar e recarrega a lista
async function executar(fn) {
  aviso("");
  try {
    await fn();
  } catch (err) {
    const msg = err.code === "permission-denied"
      ? "Sem permissão para salvar. Confira se as regras foram publicadas com o e-mail do ADM."
      : "Não foi possível salvar. Detalhe: " + (err.code || err.message);
    aviso(msg, "erro");
    return;
  }
  await carregar();
}

/* ---------- eventos ---------- */

raiz.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-acao]");
  if (!b) return;
  const { acao, id } = b.dataset;
  const cat = categorias.find((c) => c.id === id);
  const sub = subcategorias.find((s) => s.id === id);

  if (acao === "renomear-cat" && cat) executar(() => renomear("categorias", cat, categorias, "categoria"));
  if (acao === "excluir-cat" && cat) executar(() => excluirCategoria(cat));
  if (acao === "subir" && cat) executar(() => mover(cat, -1));
  if (acao === "descer" && cat) executar(() => mover(cat, +1));
  if (acao === "renomear-sub" && sub) {
    const irmas = subcategorias.filter((s) => s.categoriaId === sub.categoriaId);
    executar(() => renomear("subcategorias", sub, irmas, "subcategoria"));
  }
  if (acao === "excluir-sub" && sub) executar(() => excluirSub(sub));
});

raiz.addEventListener("submit", (e) => {
  if (!e.target.matches(".form-sub")) return;
  e.preventDefault();
  const input = e.target.querySelector("input");
  const nome = input.value;
  executar(async () => {
    await adicionarSub(e.target.dataset.catId, nome);
  });
  input.value = "";
});

formCategoria.addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = inputCategoria.value;
  executar(() => adicionarCategoria(nome));
  inputCategoria.value = "";
});

document.getElementById("botao-importar").addEventListener("click", () => executar(importarListaInicial));

/* ---------- entrada ---------- */

// Chamada pelo admin.js depois do login
export async function iniciarCategorias() {
  if (iniciado) return;
  iniciado = true;
  await carregar();
}