// Página de categoria/subcategoria: lista as peças do Firebase com filtros e ordenação.
// Endereço: produtos.html?cat=ID_DA_CATEGORIA&sub=ID_DA_SUBCATEGORIA (os dois são opcionais)

import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const porOrdem = (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0);
const ms = (t) => (t && typeof t.toMillis === "function" ? t.toMillis() : 0);

const params = new URLSearchParams(location.search);
let catId = params.get("cat") ?? "";
let subId = params.get("sub") ?? "";
let cats = [], subs = [], pecas = [];

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

function card(p, i) {
  const fotos = p.fotos ?? [];
  const vars = p.variacoes ?? [];
  const esgotada = !vars.some((v) => Number(v.estoque) > 0);
  const cores = new Set(vars.map((v) => v.cor)).size;
  const foto = el("div", { classe: "peca-foto" });
  foto.append(fotos[0] ? el("img", { src: fotos[0], alt: "", loading: "lazy", decoding: "async" }) : el("span", { classe: "sem-foto", texto: "MK" }));
  if (fotos[1]) foto.append(el("img", { classe: "segunda", src: fotos[1], alt: "", loading: "lazy" }));
  if (esgotada) foto.append(el("span", { classe: "selo esgotado", texto: "Esgotado" }));
  else if (p.destaque) foto.append(el("span", { classe: "selo", texto: "Destaque" }));

  const info = el("div", { classe: "peca-info" },
    el("h2", { classe: "peca-nome", texto: p.nome }),
    el("p", { classe: "peca-preco", texto: Number.isFinite(p.preco) ? brl.format(p.preco) : "Consulte" })
  );
  if (cores > 1) info.append(el("p", { classe: "peca-meta", texto: `${cores} cores` }));

  return el("a", { classe: "peca" + (esgotada ? " esgotada" : ""), href: `produto.html?id=${p.id}`, style: `--i:${Math.min(i, 8)}` }, foto, info);
}

function render() {
  const cat = cats.find((c) => c.id === catId);
  const sub = subs.find((s) => s.id === subId && s.categoriaId === catId);
  const titulo = sub?.nome ?? cat?.nome ?? "Coleção";
  document.title = `${titulo} · Mk Imports`;
  $("titulo").textContent = titulo;

  // Trilha: Início / Categoria / Subcategoria
  const trilha = [el("a", { href: "index.html", texto: "Início" })];
  if (cat) trilha.push(sub ? el("a", { href: "#", "data-cat": cat.id, texto: cat.nome }) : el("span", { "aria-current": "page", texto: cat.nome }));
  if (sub) trilha.push(el("span", { "aria-current": "page", texto: sub.nome }));
  if (!cat) trilha.push(el("span", { "aria-current": "page", texto: "Todas as peças" }));
  $("trilha").replaceChildren(...trilha.flatMap((t, i) => (i ? [el("span", { "aria-hidden": "true", texto: "/" }), t] : [t])));

  // Filtros: subcategorias da categoria (ou as categorias, se nenhuma foi escolhida)
  const opcoes = cat
    ? [{ nome: "Todas", cat: cat.id, sub: "" }, ...subs.filter((s) => s.categoriaId === cat.id).map((s) => ({ nome: s.nome, cat: cat.id, sub: s.id }))]
    : [{ nome: "Todas", cat: "", sub: "" }, ...cats.map((c) => ({ nome: c.nome, cat: c.id, sub: "" }))];
  $("chips").replaceChildren(...opcoes.map((o) => el("button", {
    classe: "chip", type: "button", texto: o.nome, "data-cat": o.cat, "data-sub": o.sub,
    "aria-pressed": String(o.cat === catId && o.sub === subId)
  })));

  // Peças
  let lista = pecas.filter((p) => (!catId || p.categoriaId === catId) && (!subId || p.subcategoriaId === subId));
  const modo = $("ordem").value;
  lista.sort(modo === "menor" ? (a, b) => a.preco - b.preco : modo === "maior" ? (a, b) => b.preco - a.preco : (a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  $("qtd").textContent = `${lista.length} ${lista.length === 1 ? "peça" : "peças"}`;
  $("grade").replaceChildren(...(lista.length
    ? lista.map(card)
    : [el("div", { classe: "vazio" }, el("p", { texto: "Ainda não há peças aqui. Volte em breve!" }), el("a", { href: "index.html", texto: "Voltar à vitrine" }))]));
}

function escolher(cat, sub) {
  catId = cat; subId = sub;
  const q = new URLSearchParams();
  if (cat) q.set("cat", cat);
  if (sub) q.set("sub", sub);
  history.replaceState(null, "", location.pathname + (q.size ? "?" + q : ""));
  render();
}

$("chips").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (b) escolher(b.dataset.cat, b.dataset.sub);
});
$("trilha").addEventListener("click", (e) => {
  const a = e.target.closest("a[data-cat]");
  if (a) { e.preventDefault(); escolher(a.dataset.cat, ""); }
});
$("ordem").addEventListener("change", render);

(async () => {
  try {
    const [c, s, p] = await Promise.all(["categorias", "subcategorias", "pecas"].map((n) => getDocs(collection(db, n))));
    const lista = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cats = lista(c).filter((x) => x.ativa !== false).sort(porOrdem);
    subs = lista(s).sort(porOrdem);
    pecas = lista(p).filter((x) => x.ativa !== false);
    render();
  } catch (err) {
    console.error(err);
    $("grade").replaceChildren(el("div", { classe: "vazio" }, el("p", { texto: "Não foi possível carregar as peças agora. Atualize a página para tentar de novo." })));
  }
})();