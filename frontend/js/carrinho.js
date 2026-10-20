
// ========================================
// MK IMPORTS — LÓGICA DO CARRINHO
// ========================================

const CHAVE_CARRINHO = "mkimports_carrinho";

// WhatsApp comercial da loja: somente números, com código do país.
const WHATSAPP_LOJA = "553891977700";

const $ = (id) => document.getElementById(id);

// Elementos da página
const elementoItens = $("carrinho-itens");
const elementoQuantidade = $("quantidade-itens");
const elementoSubtotal = $("subtotal-carrinho");
const elementoTotal = $("total-carrinho");
const botaoLimpar = $("limpar-carrinho");
const botaoFinalizar = $("finalizar-compra");
const elementoMensagem = $("mensagem-carrinho");

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function formatarPreco(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function lerCarrinho() {
  try {
    const dados = JSON.parse(
      localStorage.getItem(CHAVE_CARRINHO) || "[]"
    );

    return Array.isArray(dados) ? dados : [];
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

function mostrarMensagem(texto, tipo = "") {
  if (!elementoMensagem) return;

  elementoMensagem.textContent = texto;
  elementoMensagem.className = "mensagem-carrinho";

  if (tipo) {
    elementoMensagem.classList.add(tipo);
  }
}

// Cria elementos de texto sem inserir HTML fornecido pelos produtos.
function criarElemento(tag, classe, texto = "") {
  const elemento = document.createElement(tag);

  if (classe) elemento.className = classe;
  elemento.textContent = texto;

  return elemento;
}

// ========================================
// RENDERIZAÇÃO DO CARRINHO
// ========================================

function renderizarCarrinho() {
  if (!elementoItens) return;

  const carrinho = lerCarrinho();

  elementoItens.replaceChildren();

  const quantidadeTotal = carrinho.reduce(
    (total, item) => total + Math.max(0, Number(item.quantidade) || 0),
    0
  );

  const subtotal = carrinho.reduce((total, item) => {
    const preco = Math.max(0, Number(item.preco) || 0);
    const quantidade = Math.max(0, Number(item.quantidade) || 0);

    return total + preco * quantidade;
  }, 0);

  if (elementoQuantidade) {
    elementoQuantidade.textContent =
      `${quantidadeTotal} ${quantidadeTotal === 1 ? "item" : "itens"}`;
  }

  if (elementoSubtotal) {
    elementoSubtotal.textContent = formatarPreco(subtotal);
  }

  if (elementoTotal) {
    // O frete ainda será combinado com a loja.
    elementoTotal.textContent = formatarPreco(subtotal);
  }

  if (botaoFinalizar) {
    botaoFinalizar.disabled = carrinho.length === 0;
  }

  if (botaoLimpar) {
    botaoLimpar.disabled = carrinho.length === 0;
  }

  if (carrinho.length === 0) {
    renderizarCarrinhoVazio();
    return;
  }

  carrinho.forEach((item, indice) => {
    elementoItens.appendChild(criarItemCarrinho(item, indice));
  });
}

// ========================================
// ESTADO VAZIO
// ========================================

function renderizarCarrinhoVazio() {
  const container = document.createElement("div");
  container.className = "carrinho-vazio";

  container.appendChild(
    criarElemento("div", "carrinho-vazio-icone", "＋")
  );

  container.appendChild(
    criarElemento("h3", "", "SEU CARRINHO ESTÁ VAZIO")
  );

  container.appendChild(
    criarElemento(
      "p",
      "",
      "Explore a coleção e encontre sua próxima peça favorita."
    )
  );

  const link = document.createElement("a");
  link.className = "botao-voltar-loja";
  link.href = "./index.html";
  link.textContent = "EXPLORAR PRODUTOS";

  container.appendChild(link);
  elementoItens.appendChild(container);
}

// ========================================
// CRIAÇÃO DE CADA ITEM
// ========================================

function criarItemCarrinho(item, indice) {
  const preco = Math.max(0, Number(item.preco) || 0);
  const quantidade = Math.max(1, Math.floor(Number(item.quantidade) || 1));

  const container = document.createElement("article");
  container.className = "item-carrinho";

  // Imagem do produto
  const areaImagem = document.createElement("div");
  areaImagem.className = "item-carrinho-imagem";

  if (item.foto) {
    const imagem = document.createElement("img");

    imagem.src = item.foto;
    imagem.alt = item.nome || "Produto da MK IMPORTS";
    imagem.loading = "lazy";

    imagem.addEventListener("error", () => {
      imagem.removeAttribute("src");
      imagem.alt = "Imagem indisponível";
    });

    areaImagem.appendChild(imagem);
  }

  // Informações do produto
  const detalhes = document.createElement("div");
  detalhes.className = "item-carrinho-detalhes";

  detalhes.appendChild(
    criarElemento("p", "item-carrinho-categoria", "MK IMPORTS")
  );

  detalhes.appendChild(
    criarElemento("h3", "item-carrinho-nome", item.nome || "Produto")
  );

  const variacoes = document.createElement("div");
  variacoes.className = "item-carrinho-variacao";

  variacoes.appendChild(
    criarElemento("span", "", `Cor: ${item.cor || "Único"}`)
  );

  variacoes.appendChild(
    criarElemento("span", "", `Tamanho: ${item.tamanho || "Único"}`)
  );

  detalhes.appendChild(variacoes);

  detalhes.appendChild(
    criarElemento(
      "p",
      "item-carrinho-preco-unitario",
      `${formatarPreco(preco)} por unidade`
    )
  );

  // Preço, quantidade e remoção
  const acoes = document.createElement("div");
  acoes.className = "item-carrinho-acoes";

  acoes.appendChild(
    criarElemento(
      "p",
      "item-carrinho-subtotal",
      formatarPreco(preco * quantidade)
    )
  );

  const controle = document.createElement("div");
  controle.className = "controle-quantidade";

  const botaoDiminuir = criarElemento("button", "", "−");
  botaoDiminuir.type = "button";
  botaoDiminuir.setAttribute(
    "aria-label",
    `Diminuir quantidade de ${item.nome || "produto"}`
  );
  botaoDiminuir.disabled = quantidade <= 1;

  botaoDiminuir.addEventListener("click", () => {
    alterarQuantidade(indice, -1);
  });

  const numero = criarElemento("span", "", String(quantidade));

  const botaoAumentar = criarElemento("button", "", "+");
  botaoAumentar.type = "button";
  botaoAumentar.setAttribute(
    "aria-label",
    `Aumentar quantidade de ${item.nome || "produto"}`
  );

  const estoque = Number(item.estoque);
  botaoAumentar.disabled =
    Number.isFinite(estoque) &&
    estoque > 0 &&
    quantidade >= estoque;

  botaoAumentar.addEventListener("click", () => {
    alterarQuantidade(indice, 1);
  });

  controle.append(botaoDiminuir, numero, botaoAumentar);
  acoes.appendChild(controle);

  const botaoRemover = criarElemento(
    "button",
    "botao-remover",
    "Remover"
  );

  botaoRemover.type = "button";
  botaoRemover.addEventListener("click", () => {
    removerItem(indice);
  });

  acoes.appendChild(botaoRemover);

  container.append(areaImagem, detalhes, acoes);

  return container;
}

// ========================================
// ALTERAR QUANTIDADE
// ========================================

function alterarQuantidade(indice, variacao) {
  const carrinho = lerCarrinho();
  const item = carrinho[indice];

  if (!item) return;

  const quantidadeAtual = Math.max(
    1,
    Math.floor(Number(item.quantidade) || 1)
  );

  const novaQuantidade = quantidadeAtual + variacao;
  const estoque = Number(item.estoque);

  if (novaQuantidade < 1) return;

  if (
    variacao > 0 &&
    Number.isFinite(estoque) &&
    estoque > 0 &&
    novaQuantidade > estoque
  ) {
    mostrarMensagem(
      `Estoque máximo disponível para este item: ${estoque}.`,
      "erro"
    );
    return;
  }

  item.quantidade = novaQuantidade;

  try {
    salvarCarrinho(carrinho);
    mostrarMensagem("");
    renderizarCarrinho();
  } catch (erro) {
    console.error("Erro ao atualizar quantidade:", erro);
    mostrarMensagem("Não foi possível atualizar o carrinho.", "erro");
  }
}

// ========================================
// REMOVER ITEM
// ========================================

function removerItem(indice) {
  const carrinho = lerCarrinho();

  if (!carrinho[indice]) return;

  carrinho.splice(indice, 1);

  try {
    salvarCarrinho(carrinho);
    mostrarMensagem("Produto removido do carrinho.", "sucesso");
    renderizarCarrinho();
  } catch (erro) {
    console.error("Erro ao remover produto:", erro);
    mostrarMensagem("Não foi possível remover o produto.", "erro");
  }
}

// ========================================
// LIMPAR CARRINHO
// ========================================

if (botaoLimpar) {
  botaoLimpar.addEventListener("click", () => {
    const carrinho = lerCarrinho();

    if (carrinho.length === 0) return;

    const confirmar = window.confirm(
      "Deseja realmente remover todos os produtos do carrinho?"
    );

    if (!confirmar) return;

    try {
      salvarCarrinho([]);
      mostrarMensagem("Carrinho limpo.", "sucesso");
      renderizarCarrinho();
    } catch (erro) {
      console.error("Erro ao limpar carrinho:", erro);
      mostrarMensagem("Não foi possível limpar o carrinho.", "erro");
    }
  });
}

// ========================================
// FINALIZAR PEDIDO PELO WHATSAPP
// ========================================

function finalizarCompra() {
  const carrinho = lerCarrinho();

  if (carrinho.length === 0) {
    mostrarMensagem("Adicione produtos antes de finalizar.", "erro");
    return;
  }

  const subtotal = carrinho.reduce((total, item) => {
    return total +
      Math.max(0, Number(item.preco) || 0) *
      Math.max(1, Number(item.quantidade) || 1);
  }, 0);

  const linhas = [
    "Olá! Quero fazer um pedido na MK IMPORTS.",
    "",
    "*RESUMO DO PEDIDO*",
    ""
  ];

  carrinho.forEach((item, indice) => {
    linhas.push(
      `*${indice + 1}. ${item.nome || "Produto"}*`,
      `Cor: ${item.cor || "Único"}`,
      `Tamanho: ${item.tamanho || "Único"}`,
      `Quantidade: ${item.quantidade}`,
      `Valor unitário: ${formatarPreco(item.preco)}`,
      `Subtotal: ${formatarPreco(
        (Number(item.preco) || 0) *
        (Number(item.quantidade) || 0)
      )}`,
      ""
    );
  });

  linhas.push(
    `*TOTAL DOS PRODUTOS: ${formatarPreco(subtotal)}*`,
    "",
    "Gostaria de confirmar a disponibilidade, o frete e as formas de pagamento."
  );

  const mensagem = encodeURIComponent(linhas.join("\n"));
  const url = `https://wa.me/${WHATSAPP_LOJA}?text=${mensagem}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

if (botaoFinalizar) {
  botaoFinalizar.addEventListener("click", finalizarCompra);
}

// ========================================
// INICIALIZAÇÃO
// ========================================

renderizarCarrinho();
