
import { db } from "./firebase-config.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ========================================
// CONFIGURAÇÕES
// ========================================

const CHAVE_CARRINHO = "mkimports_carrinho";

const $ = (id) => document.getElementById(id);

// Elementos da página
const elementoStatus = $("produto-status");
const elementoConteudo = $("produto-conteudo");

const elementoImagem = $("produto-imagem");
const elementoMiniaturas = $("produto-miniaturas");

const elementoCategoria = $("produto-categoria");
const elementoNome = $("produto-nome");
const elementoPreco = $("produto-preco");
const elementoDescricao = $("produto-descricao");

const elementoCores = $("produto-cores");
const elementoTamanhos = $("produto-tamanhos");
const elementoQuantidade = $("produto-quantidade");
const botaoAdicionar = $("botao-adicionar-carrinho");
const elementoAviso = $("produto-aviso");

// Estado atual do produto
let produtoAtual = null;
let corSelecionada = null;
let tamanhoSelecionado = null;
let quantidadeSelecionada = 1;

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

// Formata valores para reais
function formatarPreco(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// Exibe uma mensagem na página
function mostrarMensagem(mensagem, tipo = "") {
  if (!elementoAviso) return;

  elementoAviso.textContent = mensagem;
  elementoAviso.className = "produto-aviso";

  if (tipo) {
    elementoAviso.classList.add(tipo);
  }
}

// Controla o estado de carregamento
function mostrarStatus(mensagem) {
  if (elementoStatus) {
    elementoStatus.textContent = mensagem;
    elementoStatus.hidden = false;
  }

  if (elementoConteudo) {
    elementoConteudo.hidden = true;
  }
}

// ========================================
// CARREGAMENTO DO PRODUTO
// ========================================

async function carregarProduto() {
  const parametros = new URLSearchParams(
    window.location.search
  );

  const idProduto = parametros.get("id");

  if (!idProduto) {
    mostrarStatus("Nenhum produto foi informado.");
    return;
  }

  try {
    const referencia = doc(db, "pecas", idProduto);
    const resultado = await getDoc(referencia);

    if (!resultado.exists()) {
      mostrarStatus("Produto não encontrado.");
      return;
    }

    const dados = resultado.data();

    if (dados.ativa === false) {
      mostrarStatus("Este produto não está disponível.");
      return;
    }

    produtoAtual = {
      id: resultado.id,
      ...dados
    };

    renderizarProduto();

  } catch (erro) {
    console.error("Erro ao carregar produto:", erro);
    mostrarStatus(
      "Não foi possível carregar o produto. Tente novamente."
    );
  }
}

// ========================================
// EXIBIÇÃO DOS DADOS
// ========================================

function renderizarProduto() {
  const produto = produtoAtual;

  if (elementoCategoria) {
    elementoCategoria.textContent =
      produto.categoriaNome || produto.categoriaId || "Produto";
  }

  if (elementoNome) {
    elementoNome.textContent = produto.nome || "Produto sem nome";
  }

  if (elementoPreco) {
    elementoPreco.textContent = formatarPreco(produto.preco ?? 0);
  }

  if (elementoDescricao) {
    elementoDescricao.textContent =
      produto.descricao || "Sem descrição disponível.";
  }

  renderizarImagens();
  renderizarVariacoes();

  if (elementoStatus) {
    elementoStatus.hidden = true;
  }

  if (elementoConteudo) {
    elementoConteudo.hidden = false;
  }
}

// ========================================
// GALERIA DE IMAGENS
// ========================================


function renderizarImagens() {
  const fotos = Array.isArray(produtoAtual.fotos)
    ? produtoAtual.fotos.filter(Boolean)
    : [];

  if (!elementoImagem || !elementoMiniaturas) return;

  // Limpa somente as miniaturas antigas.
  elementoMiniaturas.replaceChildren();

  // Nenhuma foto cadastrada.
  if (fotos.length === 0) {
    elementoImagem.removeAttribute("src");
    elementoImagem.alt = "Imagem indisponível";
    return;
  }

  // Usa a imagem que já existe no HTML.
  function selecionarImagem(url, botaoAtivo = null) {
    elementoImagem.src = url;
    elementoImagem.alt = produtoAtual.nome || "Imagem do produto";

    elementoMiniaturas
      .querySelectorAll(".produto-miniatura")
      .forEach((botao) => {
        botao.classList.toggle("ativa", botao === botaoAtivo);
      });
  }

  // Cria somente os botões das miniaturas.
  fotos.forEach((url, indice) => {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "produto-miniatura";
    botao.setAttribute(
      "aria-label",
      `Ver imagem ${indice + 1} do produto`
    );

    const miniatura = document.createElement("img");
    miniatura.src = url;
    miniatura.alt = "";
    miniatura.loading = "lazy";

    botao.appendChild(miniatura);

    botao.addEventListener("click", () => {
      selecionarImagem(url, botao);
    });

    elementoMiniaturas.appendChild(botao);

    // Seleciona a primeira imagem como principal.
    if (indice === 0) {
      selecionarImagem(url, botao);
    }
  });
}


// ========================================
// VARIAÇÕES: CORES E TAMANHOS
// ========================================

function renderizarVariacoes() {
  const variacoes = Array.isArray(produtoAtual.variacoes)
    ? produtoAtual.variacoes
    : [];

  if (!elementoCores || !elementoTamanhos) return;

  elementoCores.replaceChildren();
  elementoTamanhos.replaceChildren();

  const cores = [
    ...new Set(variacoes.map((v) => v.cor || "Único"))
  ];

  const tamanhos = [
    ...new Set(variacoes.map((v) => v.tamanho || "Único"))
  ];

  cores.forEach((cor) => {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "produto-opcao-botao";
    botao.textContent = cor;

    botao.addEventListener("click", () => {
      corSelecionada = cor;
      atualizarSelecao();
    });

    elementoCores.appendChild(botao);
  });

  tamanhos.forEach((tamanho) => {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "produto-opcao-botao";
    botao.textContent = tamanho;

    botao.addEventListener("click", () => {
      tamanhoSelecionado = tamanho;
      atualizarSelecao();
    });

    elementoTamanhos.appendChild(botao);
  });

  // Seleciona automaticamente a primeira opção disponível
  corSelecionada = cores[0] ?? null;
  tamanhoSelecionado = tamanhos[0] ?? null;

  atualizarSelecao();
}

// Retorna a variação correspondente às escolhas atuais
function obterVariacaoSelecionada() {
  if (!produtoAtual) return null;

  return produtoAtual.variacoes?.find((variacao) => {
    return (
      (variacao.cor || "Único") === corSelecionada &&
      (variacao.tamanho || "Único") === tamanhoSelecionado
    );
  }) || null;
}

// Atualiza botões, estoque e quantidade
function atualizarSelecao() {
  const variacoes = produtoAtual?.variacoes || [];

  atualizarBotoes(elementoCores, "cor");
  atualizarBotoes(elementoTamanhos, "tamanho");

  const variacao = obterVariacaoSelecionada();
  const estoque = Number(variacao?.estoque ?? 0);

  if (!variacao || estoque <= 0) {
    if (elementoQuantidade) {
      elementoQuantidade.value = 1;
      elementoQuantidade.disabled = true;
    }

    if (botaoAdicionar) {
      botaoAdicionar.disabled = true;
      botaoAdicionar.textContent = "Indisponível";
    }

    mostrarMensagem(
      variacao ? "Esta variação está sem estoque." : "Selecione uma combinação disponível."
    );

    return;
  }

  if (elementoQuantidade) {
    elementoQuantidade.disabled = false;
    elementoQuantidade.min = 1;
    elementoQuantidade.max = estoque;

    quantidadeSelecionada = Math.min(
      Math.max(1, Number(elementoQuantidade.value) || 1),
      estoque
    );

    elementoQuantidade.value = quantidadeSelecionada;
  }

  if (botaoAdicionar) {
    botaoAdicionar.disabled = false;
    botaoAdicionar.textContent = "Adicionar ao carrinho";
  }

  mostrarMensagem("");

  // Exibe o estoque de forma simples no console durante os testes
  console.log("Variação selecionada:", {
    cor: corSelecionada,
    tamanho: tamanhoSelecionado,
    estoque
  });
}

// Marca as opções selecionadas e desabilita combinações inexistentes
function atualizarBotoes(container, tipo) {
  if (!container || !produtoAtual) return;

  container.querySelectorAll("button").forEach((botao) => {
    const valor = botao.textContent;

    const selecionado =
      tipo === "cor"
        ? valor === corSelecionada
        : valor === tamanhoSelecionado;

    const existe = produtoAtual.variacoes?.some((variacao) => {
      const cor = variacao.cor || "Único";
      const tamanho = variacao.tamanho || "Único";

      const corresponde =
        tipo === "cor"
          ? cor === valor && tamanho === tamanhoSelecionado
          : tamanho === valor && cor === corSelecionada;

      return corresponde && Number(variacao.estoque) > 0;
    });

    botao.classList.toggle("ativa", selecionado);
    botao.setAttribute("aria-pressed", String(selecionado));

    // Não desabilita a opção atualmente selecionada.
    botao.disabled = !existe && !selecionado;
  });
}

// ========================================
// QUANTIDADE
// ========================================

if (elementoQuantidade) {
  elementoQuantidade.addEventListener("change", () => {
    const variacao = obterVariacaoSelecionada();

    if (!variacao) return;

    const estoque = Number(variacao.estoque) || 0;
    const quantidade = Number(elementoQuantidade.value) || 1;

    quantidadeSelecionada = Math.min(
      Math.max(1, Math.floor(quantidade)),
      estoque
    );

    elementoQuantidade.value = quantidadeSelecionada;
  });
}

// ========================================
// CARRINHO DE COMPRAS
// ========================================

function lerCarrinho() {
  try {
    const carrinho = JSON.parse(
      localStorage.getItem(CHAVE_CARRINHO) || "[]"
    );

    return Array.isArray(carrinho) ? carrinho : [];
  } catch (erro) {
    console.error("Erro ao ler o carrinho:", erro);
    return [];
  }
}

function salvarCarrinho(carrinho) {
  localStorage.setItem(
    CHAVE_CARRINHO,
    JSON.stringify(carrinho)
  );
}

function adicionarAoCarrinho() {
  const variacao = obterVariacaoSelecionada();

  if (!produtoAtual || !variacao) {
    mostrarMensagem("Selecione uma variação disponível.", "erro");
    return;
  }

  const estoque = Number(variacao.estoque) || 0;

  const quantidade = Math.max(
    1,
    Math.floor(Number(elementoQuantidade?.value) || 1)
  );

  if (estoque < quantidade) {
    mostrarMensagem("Quantidade maior que o estoque disponível.", "erro");
    return;
  }

  const carrinho = lerCarrinho();

  // Cada combinação de produto, cor e tamanho é um item distinto
  const indice = carrinho.findIndex((item) => {
    return (
      item.id === produtoAtual.id &&
      item.cor === (variacao.cor || "Único") &&
      item.tamanho === (variacao.tamanho || "Único")
    );
  });

  const quantidadeExistente =
    indice >= 0 ? Number(carrinho[indice].quantidade) || 0 : 0;

  if (quantidadeExistente + quantidade > estoque) {
    mostrarMensagem(
      `Você já possui esse item no carrinho. Estoque disponível: ${estoque}.`,
      "erro"
    );
    return;
  }

  const item = {
    id: produtoAtual.id,
    nome: produtoAtual.nome || "Produto",
    preco: Number(produtoAtual.preco) || 0,
    foto: produtoAtual.fotos?.[0] || "",
    cor: variacao.cor || "Único",
    tamanho: variacao.tamanho || "Único",
    quantidade,
    estoque
  };

  if (indice >= 0) {
    carrinho[indice].quantidade += quantidade;
    carrinho[indice].estoque = estoque;
  } else {
    carrinho.push(item);
  }

  try {
    salvarCarrinho(carrinho);

    mostrarMensagem(
      "Produto adicionado ao carrinho com sucesso!",
      "sucesso"
    );

    console.log("Carrinho atualizado:", lerCarrinho());

  } catch (erro) {
    console.error("Erro ao salvar o carrinho:", erro);

    mostrarMensagem(
      "Não foi possível salvar o carrinho neste navegador.",
      "erro"
    );
  }
}

if (botaoAdicionar) {
  botaoAdicionar.addEventListener("click", adicionarAoCarrinho);
}

// ========================================
// INICIALIZAÇÃO
// ========================================

carregarProduto();
