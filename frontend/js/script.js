// Header da vitrine:
//  - navbar com dropdown (categorias e subcategorias vindas do Firebase)
//  - barra que fica sólida ao rolar a página

import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const celular = window.matchMedia("(max-width: 1024px)");

const slug = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const porOrdem = (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0);

// Cria elementos sem innerHTML (nomes vindos do banco nunca viram HTML)
function el(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "classe") e.className = v;
    else if (k === "texto") e.textContent = v;
    else e.setAttribute(k, v);
  }
  filhos.forEach((f) => e.append(f));
  return e;
}

/* ---------- dropdown ---------- */

const itens = [];
let aberto = null;
let tempoFechar = null;

function abrir(item) {
  clearTimeout(tempoFechar);
  if (aberto && aberto !== item) fechar(aberto);
  item.li.classList.add("aberto");
  item.botao.setAttribute("aria-expanded", "true");
  aberto = item;
}

function fechar(item) {
  item.li.classList.remove("aberto");
  item.botao.setAttribute("aria-expanded", "false");
  if (aberto === item) aberto = null;
}

const fecharTodos = () => itens.forEach(fechar);

function criarItem(cat, lista, indice, total) {
  const li = el("li", { classe: "menu-item" });

  // Categoria sem subcategorias: link direto
  if (!lista.length) {
    li.append(el("a", { classe: "menu-link", href: `produtos.html?cat=${cat.id}`, texto: cat.nome }));
    return li;
  }

  const idSub = "sub-" + slug(cat.nome);
  const botao = el("button", {
    classe: "menu-link menu-botao", type: "button", texto: cat.nome,
    "aria-expanded": "false", "aria-haspopup": "true", "aria-controls": idSub
  });
  const submenu = el("div", {
    id: idSub,
    classe: "submenu" + (indice >= Math.ceil(total / 2) ? " alinha-direita" : "") + (lista.length > 6 ? " duas-colunas" : "")
  }, el("div", { classe: "submenu-painel" },
    el("ul", { classe: "submenu-lista" },
      el("li", {}, el("a", { classe: "ver-tudo", href: `produtos.html?cat=${cat.id}`, texto: "Ver tudo" })),
      ...lista.map((s) => el("li", {}, el("a", { href: `produtos.html?cat=${cat.id}&sub=${s.id}`, texto: s.nome })))
    )
  ));
  li.append(botao, submenu);

  const item = { li, botao, submenu };
  itens.push(item);

  botao.addEventListener("click", (e) => {
    // Com mouse no computador o hover já abriu: o clique mantém aberto em vez de fechar
    if (e.pointerType === "mouse" && !celular.matches) return abrir(item);
    aberto === item ? fechar(item) : abrir(item);
  });
  li.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !celular.matches) abrir(item); });
  li.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse" && !celular.matches) tempoFechar = setTimeout(() => fechar(item), 140);
  });
  li.addEventListener("focusout", (e) => { if (!li.contains(e.relatedTarget)) fechar(item); });
  li.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { fechar(item); botao.focus(); }
    if (e.key === "ArrowDown" && e.target === botao) {
      e.preventDefault();
      abrir(item);
      submenu.querySelector("a")?.focus();
    }
  });
  return li;
}

async function carregarMenu() {
  const menu = $("menu");
  try {
    const [c, s] = await Promise.all([
      getDocs(collection(db, "categorias")),
      getDocs(collection(db, "subcategorias"))
    ]);
    const cats = c.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.ativa !== false).sort(porOrdem);
    const subs = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(porOrdem);
    menu.replaceChildren(...cats.map((cat, i) =>
      criarItem(cat, subs.filter((x) => x.categoriaId === cat.id), i, cats.length)
    ));
  } catch (err) {
    console.error("Não foi possível carregar o menu:", err);
    menu.replaceChildren(el("li", { classe: "menu-aviso", texto: "Menu indisponível. Recarregue a página." }));
  } finally {
    menu.removeAttribute("aria-busy");
  }
}

/* ---------- menu no celular ---------- */

function alternarMenuCelular(forcar) {
  const abrirMenu = forcar ?? !$("menu").classList.contains("aberto");
  $("menu").classList.toggle("aberto", abrirMenu);
  $("barra").classList.toggle("menu-aberto", abrirMenu);
  $("botao-menu").setAttribute("aria-expanded", String(abrirMenu));
  $("botao-menu").textContent = abrirMenu ? "Fechar" : "Menu";
  if (!abrirMenu) fecharTodos();
}

$("botao-menu").addEventListener("click", () => alternarMenuCelular());
$("menu").addEventListener("click", (e) => {
  if (e.target.closest("a") && celular.matches) alternarMenuCelular(false);
});
celular.addEventListener("change", () => { alternarMenuCelular(false); fecharTodos(); });
document.addEventListener("click", (e) => { if (!e.target.closest(".menu-item")) fecharTodos(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && celular.matches) alternarMenuCelular(false); });

/* ---------- barra que fica sólida ao rolar ---------- */

let agendado = false;

function aoRolar() {
  if (agendado) return;
  agendado = true;
  requestAnimationFrame(() => {
    agendado = false;
    $("barra").classList.toggle("solida", window.scrollY > 40);
  });
}
window.addEventListener("scroll", aoRolar, { passive: true });
aoRolar();

carregarMenu();