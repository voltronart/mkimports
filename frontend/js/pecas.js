// Etapa 4: cadastro de peças no painel do ADM.
//
// Como cada peça fica no Firestore (coleção "pecas"):
//   nome, descricao, preco (em reais), categoriaId, subcategoriaId,
//   fotos: [url, ...]  (a primeira é a capa),
//   variacoes: [{ cor, tamanho, estoque }, ...],
//   ativa (aparece na vitrine), destaque, criadoEm, atualizadoEm

import { db } from "./firebase-config.js";
import * as configCloudinary from "./cloudinary-config.js";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Se o arquivo cloudinary-config.js estiver vazio ou errado, o painel continua
// funcionando (só sem envio de fotos, usando links).
const CLOUDINARY = configCloudinary.CLOUDINARY ?? { cloudName: "", uploadPreset: "" };

const $ = (id) => document.getElementById(id);
const MAX_FOTOS = 8;
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

let categorias = [];
let subcategorias = [];
let pecas = [];
let editandoId = null;
let fotos = [];
let variacoes = [];

/* ---------- utilitários ---------- */

const porOrdem = (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0);
const ms = (t) => (t && typeof t.toMillis === "function" ? t.toMillis() : 0);
const cloudinaryOk = () => Boolean(CLOUDINARY.cloudName && CLOUDINARY.uploadPreset);
const chave = (v) => `${v.cor.trim().toLowerCase()}|${v.tamanho.trim().toLowerCase()}`;

function aviso(texto, tipo = "") {
  const a = $("pecas-aviso");
  a.textContent = texto;
  a.className = "aviso " + tipo;
  a.hidden = !texto;
  if (texto) a.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// Cria elementos sem innerHTML (o que o ADM digita nunca vira HTML)
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

// Aceita "129,90", "129.90", "R$ 1.299,90"
function lerPreco(texto) {
  let t = texto.replace(/R\$|\s/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

const nomeCategoria = (id) => categorias.find((c) => c.id === id)?.nome ?? "Sem categoria";
const nomeSub = (id) => subcategorias.find((s) => s.id === id)?.nome ?? "";

/* ---------- carregar dados ---------- */

export async function carregarPecas() {
  try {
    const [c, s, p] = await Promise.all([
      getDocs(collection(db, "categorias")),
      getDocs(collection(db, "subcategorias")),
      getDocs(collection(db, "pecas"))
    ]);
    categorias = c.docs.map((d) => ({ id: d.id, ...d.data() })).sort(porOrdem);
    subcategorias = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(porOrdem);
    pecas = p.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
    preencherCategorias($("peca-categoria").value, $("peca-subcategoria").value);
    renderLista();
  } catch (err) {
    aviso("Não foi possível carregar as peças. Detalhe: " + (err.code || err.message), "erro");
  }
}

/* ---------- selects de categoria e subcategoria ---------- */

function preencherCategorias(catId = "", subId = "") {
  const sel = $("peca-categoria");
  sel.replaceChildren(el("option", { value: "", texto: categorias.length ? "Escolha…" : "Crie categorias primeiro" }));
  categorias.forEach((c) => sel.append(el("option", { value: c.id, texto: c.nome })));
  sel.value = categorias.some((c) => c.id === catId) ? catId : "";
  preencherSubcategorias(subId);
}

function preencherSubcategorias(subId = "") {
  const catId = $("peca-categoria").value;
  const sel = $("peca-subcategoria");
  const subs = subcategorias.filter((s) => s.categoriaId === catId);
  const rotulo = !catId ? "Escolha a categoria primeiro" : subs.length ? "Escolha…" : "Sem subcategorias";
  sel.replaceChildren(el("option", { value: "", texto: rotulo }));
  subs.forEach((s) => sel.append(el("option", { value: s.id, texto: s.nome })));
  sel.disabled = !subs.length;
  sel.value = subs.some((s) => s.id === subId) ? subId : "";
}

$("peca-categoria").addEventListener("change", () => preencherSubcategorias(""));

/* ---------- fotos ---------- */

function textoDicaFotos() {
  $("foto-dica").textContent = cloudinaryOk()
    ? "A primeira foto é a capa. Até " + MAX_FOTOS + " fotos."
    : "Envio de fotos ainda não configurado: cole o link de uma imagem (veja js/cloudinary-config.js).";
  $("botao-enviar-fotos").hidden = !cloudinaryOk();
}

function renderFotos() {
  const box = $("fotos-lista");
  box.replaceChildren();
  if (!fotos.length) box.append(el("p", { classe: "vazio", texto: "Nenhuma foto adicionada." }));
  fotos.forEach((url, i) => {
    box.append(el("div", { classe: "foto-item" },
      el("img", { src: url, alt: "Foto " + (i + 1) + " da peça" }),
      i === 0 ? el("span", { classe: "etiqueta", texto: "Capa" }) : botao("Tornar capa", "capa", { i }),
      botao("Remover", "remover-foto", { i }, "perigo")
    ));
  });
}

$("fotos-lista").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-acao]");
  if (!b) return;
  const i = Number(b.dataset.i);
  if (b.dataset.acao === "capa") fotos.unshift(...fotos.splice(i, 1));
  if (b.dataset.acao === "remover-foto") fotos.splice(i, 1);
  renderFotos();
});

async function enviarParaCloudinary(arquivo) {
  const dados = new FormData();
  dados.append("file", arquivo);
  dados.append("upload_preset", CLOUDINARY.uploadPreset);
  dados.append("folder", "mk-imports");
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`, { method: "POST", body: dados });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "falha no envio");
  // Entrega otimizada: formato e qualidade automáticos, largura máxima 1200px
  return j.secure_url.replace("/upload/", "/upload/f_auto,q_auto,w_1200/");
}

$("botao-enviar-fotos").addEventListener("click", () => $("foto-arquivo").click());

$("foto-arquivo").addEventListener("change", async (e) => {
  const arquivos = [...e.target.files];
  e.target.value = "";
  for (const arq of arquivos) {
    if (fotos.length >= MAX_FOTOS) {
      $("foto-dica").textContent = "Limite de " + MAX_FOTOS + " fotos por peça.";
      break;
    }
    $("foto-dica").textContent = "Enviando " + arq.name + "…";
    try {
      fotos.push(await enviarParaCloudinary(arq));
      renderFotos();
    } catch (err) {
      $("foto-dica").textContent = "Não foi possível enviar " + arq.name + ": " + err.message;
      return;
    }
  }
  textoDicaFotos();
});

$("botao-foto-url").addEventListener("click", () => {
  const campo = $("foto-url");
  const url = campo.value.trim();
  if (!/^https?:\/\//i.test(url)) {
    $("foto-dica").textContent = "Cole um link que comece com https://";
    return;
  }
  if (fotos.length >= MAX_FOTOS) {
    $("foto-dica").textContent = "Limite de " + MAX_FOTOS + " fotos por peça.";
    return;
  }
  fotos.push(url);
  campo.value = "";
  renderFotos();
  textoDicaFotos();
});

/* ---------- variações (cor, tamanho, estoque) ---------- */

function renderVariacoes() {
  const corpo = $("variacoes-corpo");
  corpo.replaceChildren();
  if (!variacoes.length) {
    corpo.append(el("tr", {}, el("td", { colspan: "4", classe: "vazio", texto: "Nenhuma variação ainda. Use o gerador acima ou adicione manualmente." })));
    return;
  }
  variacoes.forEach((v, i) => {
    corpo.append(el("tr", {},
      el("td", {}, el("input", { type: "text", maxlength: "30", value: v.cor, dados: { i, campo: "cor" }, "aria-label": "Cor da variação " + (i + 1) })),
      el("td", {}, el("input", { type: "text", maxlength: "20", value: v.tamanho, dados: { i, campo: "tamanho" }, "aria-label": "Tamanho da variação " + (i + 1) })),
      el("td", {}, el("input", { type: "number", min: "0", step: "1", value: String(v.estoque), dados: { i, campo: "estoque" }, "aria-label": "Estoque da variação " + (i + 1) })),
      el("td", {}, botao("Remover", "remover-var", { i }, "perigo"))
    ));
  });
}

$("variacoes-corpo").addEventListener("input", (e) => {
  const campo = e.target.dataset.campo;
  if (!campo) return;
  variacoes[Number(e.target.dataset.i)][campo] = e.target.value;
});

$("variacoes-corpo").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-acao='remover-var']");
  if (!b) return;
  variacoes.splice(Number(b.dataset.i), 1);
  renderVariacoes();
});

$("botao-add-variacao").addEventListener("click", () => {
  variacoes.push({ cor: "", tamanho: "", estoque: 0 });
  renderVariacoes();
});

const lerLista = (texto) => [...new Set(texto.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean))];

$("botao-gerar").addEventListener("click", () => {
  const cores = lerLista($("gerar-cores").value);
  const tamanhos = lerLista($("gerar-tamanhos").value);
  // Peças sem cor ou sem tamanho (ex.: carteira) usam "Único"
  const listaCores = cores.length ? cores : ["Único"];
  const listaTamanhos = tamanhos.length ? tamanhos : ["Único"];
  const existentes = new Set(variacoes.map(chave));
  let novas = 0;
  listaCores.forEach((cor) => listaTamanhos.forEach((tamanho) => {
    const v = { cor, tamanho, estoque: 0 };
    if (!existentes.has(chave(v))) { variacoes.push(v); novas++; }
  }));
  $("gerar-cores").value = "";
  $("gerar-tamanhos").value = "";
  renderVariacoes();
  aviso(novas ? `${novas} variações criadas com estoque 0. Preencha as quantidades na tabela.` : "Essas combinações já existem na tabela.", novas ? "ok" : "");
});

/* ---------- formulário ---------- */

function abrirForm(peca = null) {
  aviso("");
  editandoId = peca ? peca.id : null;
  $("titulo-form-peca").textContent = peca ? "Editar peça" : "Nova peça";
  $("peca-nome").value = peca?.nome ?? "";
  $("peca-preco").value = peca ? Number(peca.preco).toFixed(2).replace(".", ",") : "";
  $("peca-descricao").value = peca?.descricao ?? "";
  preencherCategorias(peca?.categoriaId ?? "", peca?.subcategoriaId ?? "");
  fotos = [...(peca?.fotos ?? [])];
  variacoes = (peca?.variacoes ?? []).map((v) => ({ ...v }));
  $("peca-ativa").checked = peca ? peca.ativa !== false : true;
  $("peca-destaque").checked = peca?.destaque === true;
  $("gerar-cores").value = "";
  $("gerar-tamanhos").value = "";
  $("foto-url").value = "";
  textoDicaFotos();
  renderFotos();
  renderVariacoes();
  $("form-peca").hidden = false;
  $("botao-nova-peca").hidden = true;
  $("form-peca").scrollIntoView({ behavior: "smooth", block: "start" });
  $("peca-nome").focus();
}

function fecharForm() {
  $("form-peca").hidden = true;
  $("botao-nova-peca").hidden = false;
  editandoId = null;
}

$("botao-nova-peca").addEventListener("click", () => abrirForm());
$("botao-cancelar-peca").addEventListener("click", fecharForm);

// Valida e devolve os dados prontos, ou uma mensagem de erro
function montarDados() {
  const nome = $("peca-nome").value.trim();
  const preco = lerPreco($("peca-preco").value);
  const categoriaId = $("peca-categoria").value;
  const subcategoriaId = $("peca-subcategoria").value;
  const temSubs = subcategorias.some((s) => s.categoriaId === categoriaId);

  if (!nome) return { erro: "Informe o nome da peça." };
  if (preco === null) return { erro: "Informe um preço válido, por exemplo 129,90." };
  if (!categoriaId) return { erro: "Escolha a categoria." };
  if (temSubs && !subcategoriaId) return { erro: "Escolha a subcategoria." };
  if (!variacoes.length) return { erro: "Adicione pelo menos uma variação (cor e tamanho). Para peças sem cor ou tamanho, use \"Único\"." };

  const limpas = [];
  const vistas = new Set();
  for (const v of variacoes) {
    const cor = v.cor.trim();
    const tamanho = v.tamanho.trim();
    if (!cor || !tamanho) return { erro: "Toda variação precisa de cor e tamanho. Preencha ou remova as linhas vazias." };
    const estoque = Math.max(0, parseInt(v.estoque, 10) || 0);
    const k = chave({ cor, tamanho });
    if (vistas.has(k)) return { erro: `A variação ${cor} / ${tamanho} está repetida.` };
    vistas.add(k);
    limpas.push({ cor, tamanho, estoque });
  }

  return {
    dados: {
      nome,
      descricao: $("peca-descricao").value.trim(),
      preco,
      categoriaId,
      subcategoriaId: temSubs ? subcategoriaId : "",
      fotos: [...fotos],
      variacoes: limpas,
      ativa: $("peca-ativa").checked,
      destaque: $("peca-destaque").checked
    }
  };
}

async function executar(fn) {
  aviso("");
  try {
    await fn();
    return true;
  } catch (err) {
    aviso(err.code === "permission-denied"
      ? "Sem permissão para salvar. Confira se as regras foram publicadas com o e-mail do ADM."
      : "Não foi possível salvar. Detalhe: " + (err.code || err.message), "erro");
    return false;
  }
}

$("form-peca").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { dados, erro } = montarDados();
  if (erro) return aviso(erro, "erro");

  const botaoSalvar = $("botao-salvar-peca");
  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando…";
  const ok = await executar(async () => {
    if (editandoId) {
      await updateDoc(doc(db, "pecas", editandoId), { ...dados, atualizadoEm: serverTimestamp() });
    } else {
      await addDoc(collection(db, "pecas"), { ...dados, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
    }
  });
  botaoSalvar.disabled = false;
  botaoSalvar.textContent = "Salvar peça";
  if (!ok) return;

  fecharForm();
  aviso(`Peça "${dados.nome}" salva.`, "ok");
  await carregarPecas();
});

/* ---------- lista de peças ---------- */

function renderLista() {
  const raiz = $("lista-pecas");
  raiz.replaceChildren();
  if (!pecas.length) {
    raiz.append(el("p", { classe: "vazio", texto: "Nenhuma peça cadastrada ainda. Clique em \"Nova peça\" para começar." }));
    return;
  }
  pecas.forEach((p) => {
    const estoque = (p.variacoes ?? []).reduce((soma, v) => soma + (Number(v.estoque) || 0), 0);
    const sub = nomeSub(p.subcategoriaId);
    const capa = p.fotos?.[0]
      ? el("img", { classe: "peca-capa", src: p.fotos[0], alt: p.nome, loading: "lazy" })
      : el("div", { classe: "peca-capa sem-foto", texto: "Sem foto" });

    const etiquetas = el("div", { classe: "etiquetas" });
    if (p.ativa === false) etiquetas.append(el("span", { classe: "etiqueta cinza", texto: "Inativa" }));
    if (p.destaque) etiquetas.append(el("span", { classe: "etiqueta", texto: "Destaque" }));
    if (estoque === 0) etiquetas.append(el("span", { classe: "etiqueta vermelha", texto: "Sem estoque" }));

    raiz.append(el("article", { classe: "peca-card" },
      capa,
      el("div", { classe: "peca-info" },
        el("strong", { texto: p.nome }),
        el("span", { classe: "vazio", texto: nomeCategoria(p.categoriaId) + (sub ? " › " + sub : "") }),
        el("span", { texto: moeda.format(p.preco) + " · " + (p.variacoes?.length ?? 0) + " variações · " + estoque + " un. em estoque" }),
        etiquetas
      ),
      el("div", { classe: "acoes" },
        botao("Editar", "editar", { id: p.id }),
        botao(p.ativa === false ? "Ativar" : "Desativar", "alternar", { id: p.id }),
        botao("Excluir", "excluir", { id: p.id }, "perigo")
      )
    ));
  });
}

$("lista-pecas").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-acao]");
  if (!b) return;
  const peca = pecas.find((p) => p.id === b.dataset.id);
  if (!peca) return;

  if (b.dataset.acao === "editar") return abrirForm(peca);

  if (b.dataset.acao === "alternar") {
    if (await executar(() => updateDoc(doc(db, "pecas", peca.id), { ativa: peca.ativa === false, atualizadoEm: serverTimestamp() }))) {
      aviso(peca.ativa === false ? `"${peca.nome}" agora aparece na vitrine.` : `"${peca.nome}" foi escondida da vitrine.`, "ok");
      await carregarPecas();
    }
  }

  if (b.dataset.acao === "excluir") {
    if (!confirm(`Excluir a peça "${peca.nome}"? Isso não pode ser desfeito.`)) return;
    if (await executar(() => deleteDoc(doc(db, "pecas", peca.id)))) {
      aviso(`Peça "${peca.nome}" excluída.`, "ok");
      await carregarPecas();
    }
  }
});