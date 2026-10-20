
/*
 * Rodapé da MK Imports
 *
 * Responsabilidades:
 * 1. Preencher os dados da loja.
 * 2. Configurar WhatsApp, Instagram e mapa.
 * 3. Criar links para as categorias da vitrine.
 * 4. Atualizar o ano automaticamente.
 * 5. Controlar a animação de entrada.
 */

import * as configLoja from "./loja-config.js";

const LOJA = configLoja.LOJA ?? {};

const $ = (id) => document.getElementById(id);

/* ==================================================
   1. FUNÇÕES AUXILIARES
================================================== */

/**
 * Cria elementos HTML sem inserir conteúdo como HTML bruto.
 * Isso evita interpretar textos externos como marcação HTML.
 */
function el(tag, attrs = {}, ...filhos) {
  const elemento = document.createElement(tag);

  for (const [chave, valor] of Object.entries(attrs)) {
    if (valor == null) continue;

    if (chave === "classe") {
      elemento.className = valor;
    } else if (chave === "texto") {
      elemento.textContent = valor;
    } else {
      elemento.setAttribute(chave, valor);
    }
  }

  elemento.append(...filhos);
  return elemento;
}

/**
 * Retorna uma string limpa para uso nas configurações.
 */
function textoConfig(valor) {
  return typeof valor === "string" || typeof valor === "number"
    ? String(valor).trim()
    : "";
}

/* ==================================================
   2. ANO AUTOMÁTICO
================================================== */

const ano = $("ano");

if (ano) {
  ano.textContent = new Date().getFullYear();
}

/* ==================================================
   3. ENDEREÇO, ROTA E MAPA
================================================== */

const endereco = textoConfig(LOJA.endereco);
const elementoEndereco = $("rodape-endereco");
const botaoRota = $("rodape-rota");
const mapa = $("rodape-mapa");

if (elementoEndereco) {
  elementoEndereco.textContent = endereco || "Endereço em breve.";
}

if (endereco) {
  const consultaMapa = encodeURIComponent(endereco);

  // Botão para abrir a localização no Google Maps.
  if (botaoRota) {
    botaoRota.href =
      `https://www.google.com/maps/search/?api=1&query=${consultaMapa}`;

    botaoRota.hidden = false;
  }

  // Mapa incorporado ao rodapé.
  if (mapa) {
    const iframe = el("iframe", {
      src: `https://www.google.com/maps?q=${consultaMapa}&output=embed`,
      title: "Mapa com a localização da loja",
      loading: "lazy",
      referrerpolicy: "no-referrer-when-downgrade",
      allowfullscreen: ""
    });

    iframe.style.border = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";

    mapa.replaceChildren(iframe);
    mapa.hidden = false;
  }
}

/* ==================================================
   4. HORÁRIO DE FUNCIONAMENTO
================================================== */

const horario = textoConfig(LOJA.horario);
const elementoHorario = $("rodape-horario");

if (elementoHorario) {
  if (horario) {
    elementoHorario.textContent = horario;
    elementoHorario.hidden = false;
  } else {
    elementoHorario.textContent = "";
    elementoHorario.hidden = true;
  }
}

/* ==================================================
   5. WHATSAPP E INSTAGRAM
================================================== */

const whatsapp = $("rodape-whatsapp");
const instagram = $("rodape-instagram");
const contato = $("rodape-contato");

// WhatsApp: aceita número com espaços, parênteses, + e traços.
const numeroWhatsApp = textoConfig(LOJA.whatsapp).replace(/\D/g, "");

if (whatsapp) {
  if (numeroWhatsApp) {
    whatsapp.href = `https://wa.me/${numeroWhatsApp}`;
    whatsapp.hidden = false;
  } else {
    whatsapp.hidden = true;
  }
}

// Instagram: aceita URL completa ou nome de usuário.
let urlInstagram = textoConfig(LOJA.instagram);

if (urlInstagram && !/^https?:\/\//i.test(urlInstagram)) {
  const usuario = urlInstagram
    .replace(/^@/, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/\/+$/, "");

  if (/^[a-zA-Z0-9._]+$/.test(usuario)) {
    urlInstagram = `https://www.instagram.com/${usuario}/`;
  } else {
    urlInstagram = "";
  }
}

// Permite somente endereços HTTP ou HTTPS.
const instagramValido = /^https?:\/\/.+/i.test(urlInstagram);

if (instagram) {
  if (instagramValido) {
    instagram.href = urlInstagram;
    instagram.hidden = false;
  } else {
    instagram.hidden = true;
  }
}

// Esconde toda a seção se nenhum contato estiver disponível.
if (contato) {
  contato.hidden = !numeroWhatsApp && !instagramValido;
}

/* ==================================================
   6. CATEGORIAS DA VITRINE
================================================== */

const vitrine = $("vitrine-categorias");
const listaCategorias = $("rodape-categorias");
const navegacaoCategorias = document.querySelector(".rodape-categorias");

function montarCategorias() {
  if (!vitrine || !listaCategorias) {
    return false;
  }

  // Busca as seções de categoria criadas pela vitrine.
  const secoes = [...vitrine.querySelectorAll(".cat")];

  // Só considera categorias que possuem ID e título.
  const categorias = secoes
    .map((secao) => {
      const titulo = secao.querySelector(".cat-titulo");

      if (!secao.id || !titulo) {
        return null;
      }

      return {
        id: secao.id,
        nome: titulo.textContent.trim()
      };
    })
    .filter((categoria) => categoria && categoria.nome);

  // Evita exibir uma navegação vazia.
  if (!categorias.length) {
    if (navegacaoCategorias) {
      navegacaoCategorias.hidden = true;
    }

    return false;
  }

  // Gera os links e substitui a lista anterior.
  const itens = categorias.map(({ id, nome }) => {
    const link = el("a", {
      classe: "rodape-link",
      href: `#${id}`,
      texto: nome
    });

    return el("li", {}, link);
  });

  listaCategorias.replaceChildren(...itens);

  if (navegacaoCategorias) {
    navegacaoCategorias.hidden = false;
  }

  return true;
}

// Tenta carregar as categorias imediatamente.
const categoriasMontadas = montarCategorias();

// Se a vitrine ainda estiver carregando, observa suas alterações.
if (vitrine && !categoriasMontadas) {
  const observadorCategorias = new MutationObserver(() => {
    if (montarCategorias()) {
      observadorCategorias.disconnect();
    }
  });

  observadorCategorias.observe(vitrine, {
    childList: true,
    subtree: true
  });
}

/* ==================================================
   7. ANIMAÇÃO DE ENTRADA DO RODAPÉ
================================================== */

const rodape = document.querySelector(".rodape");

if (rodape && "IntersectionObserver" in window) {
  const observadorRodape = new IntersectionObserver(
    ([entrada], observador) => {
      if (entrada.isIntersecting) {
        rodape.classList.add("visivel");
        observador.disconnect();
      }
    },
    {
      threshold: 0.15
    }
  );

  observadorRodape.observe(rodape);
} else if (rodape) {
  // Fallback para navegadores sem suporte ao observador.
  rodape.classList.add("visivel");
}
