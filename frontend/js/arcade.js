// Quadro do mini game: o jogo só carrega quando o visitante clica em "Jogar agora".
// No celular ele abre em tela cheia (botão ✕ para sair).

const tela = document.getElementById("arcade-tela");
const jogo = document.getElementById("arcade-jogo");
const iniciar = document.getElementById("arcade-iniciar");
const sair = document.getElementById("arcade-sair");
const toque = matchMedia("(pointer: coarse)");

function abrir() {
  jogo.src = jogo.dataset.src;
  jogo.addEventListener("load", () => jogo.contentWindow?.focus(), { once: true }); // as teclas passam a valer no jogo
  iniciar.hidden = true;
  if (toque.matches) { tela.classList.add("cheio"); sair.hidden = false; document.body.style.overflow = "hidden"; }
  jogo.focus();
}

function fechar() {
  jogo.src = "about:blank";
  tela.classList.remove("cheio");
  sair.hidden = true;
  iniciar.hidden = false;
  document.body.style.overflow = "";
}

iniciar.addEventListener("click", abrir);
sair.addEventListener("click", fechar);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && tela.classList.contains("cheio")) fechar(); });