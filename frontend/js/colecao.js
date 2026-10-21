// Seção de categorias: lê o Firebase e monta um layout diferente para cada categoria.

import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const POSICAO_ARCADE = 4; // o quadro do jogo entra depois da 4ª categoria (use 0 para o começo)
const LAYOUTS = ["camisetas", "shorts", "calca", "calcados", "lupas", "bones", "outros", "kits"];

// Usado só se o banco estiver vazio ou indisponível
const MODELO = [
  ["Camisetas", ["30.1 Importada", "Gola Polo Importada", "Gola Polo Piquet", "Malha Pima", "Malha Chinesa", "Gola Polo Dry-Fit", "Tricor", "Texturizada"]],
  ["Shorts", ["Sarja", "Cargo", "Linho", "Elastano", "Jeans", "Jogador"]],
  ["Calça", ["Jogador", "Tradicional"]],
  ["Calçados", ["Tênis", "Chinelo", "Sandália"]],
  ["Lupas", ["Juliet"]],
  ["Bonés", ["Premium", "Importado"]],
  ["Outros", ["Cueca", "Carteira"]],
  ["Kits", ["Nike Academy"]]
];

const norm = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const porOrdem = (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0);
const pad = (n) => String(n).padStart(2, "0");

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

async function carregar() {
  try {
    const [c, s, p] = await Promise.all(["categorias", "subcategorias", "pecas"].map((n) => getDocs(collection(db, n))));
    const lista = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const cats = lista(c).filter((x) => x.ativa !== false).sort(porOrdem);
    if (!cats.length) throw new Error("sem categorias");
    const subs = lista(s).sort(porOrdem);
    const pecas = lista(p).filter((x) => x.ativa !== false);
    const capa = (filtro) => pecas.find((x) => filtro(x) && x.fotos?.length)?.fotos[0] ?? "";

    return cats.map((cat) => {
      const filhas = subs.filter((x) => x.categoriaId === cat.id);
      const itens = filhas.length
        ? filhas.map((x) => ({ nome: x.nome, href: `produtos.html?cat=${cat.id}&sub=${x.id}`, capa: capa((q) => q.subcategoriaId === x.id) }))
        : [{ nome: cat.nome, href: `produtos.html?cat=${cat.id}`, capa: capa((q) => q.categoriaId === cat.id) }];
      return { nome: cat.nome, itens };
    });
  } catch (err) {
    console.warn("Usando a lista modelo:", err.message);
    return MODELO.map(([nome, subs]) => ({ nome, itens: subs.map((n) => ({ nome: n, href: "#", capa: "" })) }));
  }
}

function card(item, i) {
  const img = el("span", { classe: "sub-img" });
  if (item.capa) img.style.setProperty("--foto", `url("${item.capa.replace(/"/g, "%22")}")`);
  return el("a", { classe: "sub", href: item.href, style: `--i:${i}` },
    img,
    el("span", { classe: "sub-n", texto: pad(i + 1) }),
    el("span", { classe: "sub-nome", texto: item.nome }),
    el("span", { classe: "sub-seta", "aria-hidden": "true", texto: "→" })
  );
}

function secao(cat, n, total) {
  const chave = norm(cat.nome);
  const qtd = cat.itens.length;
  return el("section", { classe: "cat", id: "cat-" + chave, "data-layout": LAYOUTS.includes(chave) ? chave : "geral" },
    el("header", { classe: "cat-topo" },
      el("div", {},
        el("span", { classe: "cat-num", texto: `${pad(n + 1)} / ${pad(total)}` }),
        el("h2", { classe: "cat-titulo", texto: cat.nome })
      ),
      el("p", { classe: "cat-qtd", texto: `${qtd} ${qtd === 1 ? "estilo" : "estilos"}` })
    ),
    el("div", { classe: "cat-lista" }, ...cat.itens.map(card))
  );
}

(async () => {
  const raiz = document.getElementById("vitrine-categorias");
  const cats = await carregar();
  raiz.replaceChildren(...cats.map((c, i) => secao(c, i, cats.length)));
  const arcade = document.getElementById("arcade"); // quadro do mini game, escrito no index.html
  if (arcade) raiz.insertBefore(arcade, raiz.children[POSICAO_ARCADE] ?? null);

  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visivel"); obs.unobserve(e.target); } });
  }, { threshold: 0.15 });
  raiz.querySelectorAll(".cat").forEach((s) => obs.observe(s));
})();