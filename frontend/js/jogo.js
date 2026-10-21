// Mini game "Abra a Loja" · Mk Imports
// Teclado: A/D mover, ESPAÇO pular, J atacar. Celular: botões na tela.
// Teste direto uma fase: jogo.html?fase=2  ou  jogo.html?fase=3

const L = 960, A = 540, CHAO = 470, G = 2200;
const cv = document.getElementById("tela"), cx = cv.getContext("2d");
cv.width = L; cv.height = A;
const rnd = (a, b) => a + Math.random() * (b - a);
const choque = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const FONTE = "Anton, Impact, sans-serif";

/* Sprites do jogador: uma sequência de quadros por ação, em img/jogo/
     parado-1.png ... parado-3.png
     andar-1.png  ... andar-6.png
     pular-1.png  ... pular-6.png
     atacar-1.png ... atacar-6.png
   Todos com o personagem olhando para a DIREITA, fundo transparente, mesmo tamanho de imagem
   e os pés na base. Para mudar a quantidade de quadros ou a velocidade, edite ANIMACOES.
   Se faltar algum arquivo, o jogo usa só os que existirem; sem nenhum, desenha um boneco. */
const ALTURA_SPRITE = 104; // altura do personagem na tela, em pixels
const ATQ_DURACAO = 0.24;  // duração do ataque, em segundos (os quadros se espalham nesse tempo)
const ANIMACOES = {
  parado: { quadros: 3, fps: 5 },  // fps = quadros por segundo (menor = mais lento)
  andar:  { quadros: 6, fps: 12 },
  pular:  { quadros: 6 },          // acompanha a subida e a descida do pulo
  atacar: { quadros: 3 }           // toca do primeiro ao último durante o golpe
};
for (const [nome, a] of Object.entries(ANIMACOES)) {
  a.imgs = [...Array(a.quadros)].map((_, i) => { const im = new Image(); im.src = `assets/${nome}-${i + 1}.png`; return im; });
}
const pronto = (im) => im.complete && im.naturalWidth > 0;

/* Fases */
const FASES = [
  { nome: "FASE 1 · CONTAS A PAGAR", dica: "Pegue 6 camisetas para abrir a loja", meta: 6, intervalo: 2.4, tipos: ["conta"], plat: [[140, 360, 200], [620, 360, 200]], ceu: ["#f6b26b", "#3b2a4a"], pred: "#1b1530" },
  { nome: "FASE 2 · MADRUGADA DO MEDO", dica: "Contas, medo e fiscal. Pegue 10 camisetas", meta: 10, intervalo: 1.5, tipos: ["conta", "conta", "medo", "medo", "fiscal"], plat: [[110, 370, 190], [385, 260, 190], [660, 370, 190]], ceu: ["#1d2b64", "#0a0a1a"], pred: "#0c0c1e" },
  { nome: "FASE 3 · O BOLETO GIGANTE", dica: "Derrote o chefão para abrir a loja", boss: true, intervalo: 3.6, tipos: ["conta"], plat: [[90, 360, 170], [700, 360, 170]], ceu: ["#5a0f1a", "#12060a"], pred: "#1a0a10" }
];
const DEF = { conta: { w: 40, h: 48, hp: 1, v: 75, pts: 50 }, medo: { w: 48, h: 50, hp: 1, v: 95, pts: 80 }, fiscal: { w: 50, h: 80, hp: 3, v: 60, pts: 200 } };
const predios = [...Array(14)].map((_, i) => ({ x: i * 90, w: rnd(60, 100), h: rnd(120, 300) }));

/* Controles */
const k = {}, t = { esq: 0, dir: 0, pulo: 0, atq: 0 };
let pressPulo = false, pressAtq = false;
addEventListener("keydown", (e) => {
  if (["Space", "KeyA", "KeyD", "KeyJ"].includes(e.code)) e.preventDefault();
  if (!k[e.code]) {
    if (e.code === "Space") pressPulo = true;
    if (e.code === "KeyJ") pressAtq = true;
    if (e.code === "Enter" || e.code === "Space") comecar();
  }
  k[e.code] = 1;
});
addEventListener("keyup", (e) => (k[e.code] = 0));
document.querySelectorAll("[data-btn]").forEach((b) => {
  const n = b.dataset.btn;
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); t[n] = 1; if (n === "pulo") pressPulo = true; if (n === "atq") pressAtq = true; });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => b.addEventListener(ev, () => (t[n] = 0)));
});
cv.addEventListener("pointerdown", () => comecar());

/* Estado */
let estado = "menu", vitoria = false, fase = 0, F = FASES[0], score = 0, tempo = 0, introT = 0, golpe = 0;
let p, inimigos, itens, tiros, boss, got, spawn, spawnItem;

function comecar() { if (estado === "menu" || estado === "fim") { score = 0; iniciarFase(Math.min(2, Math.max(0, (+new URLSearchParams(location.search).get("fase") || 1) - 1))); } }

function iniciarFase(i) {
  fase = i; F = FASES[i];
  p = { x: 100, y: CHAO - 84, w: 44, h: 84, vx: 0, vy: 0, face: 1, chao: true, vida: 3, inv: 0, atq: 0, cd: 0 };
  inimigos = []; itens = []; tiros = []; got = 0; spawn = 1; spawnItem = 1; pressPulo = pressAtq = false;
  boss = F.boss ? { x: 720, y: CHAO - 190, w: 150, h: 190, hp: 30, max: 30, dir: -1, tiro: 2, flash: 0, golpe: -1 } : null;
  estado = "intro"; introT = 2.4;
  document.getElementById("cta").hidden = true;
}

function fim(ganhou) { estado = "fim"; vitoria = ganhou; document.getElementById("cta").hidden = !ganhou; }

function dano() {
  if (p.inv > 0) return;
  p.vida--; p.inv = 1.3; p.vy = -420;
  if (p.vida <= 0) fim(false);
}

function atualizar(dt) {
  tempo += dt;
  if (estado === "intro") { introT -= dt; if (introT <= 0) estado = "jogo"; return; }
  if (estado !== "jogo") return;

  /* Jogador */
  const esq = k.KeyA || t.esq, dir = k.KeyD || t.dir;
  p.vx = ((dir ? 1 : 0) - (esq ? 1 : 0)) * 290;
  if (dir && !esq) p.face = 1; if (esq && !dir) p.face = -1;
  if (pressPulo && p.chao) { p.vy = -830; p.chao = false; }
  if (pressAtq && p.cd <= 0) { p.atq = ATQ_DURACAO; p.cd = 0.4; golpe++; }
  pressPulo = pressAtq = false;
  p.atq -= dt; p.cd -= dt; p.inv -= dt;
  const antes = p.y + p.h;
  p.vy += G * dt; p.x = Math.max(0, Math.min(L - p.w, p.x + p.vx * dt)); p.y += p.vy * dt;
  p.chao = false;
  if (p.y + p.h >= CHAO) { p.y = CHAO - p.h; p.vy = 0; p.chao = true; }
  else if (p.vy >= 0) for (const [x, y, w] of F.plat) if (antes <= y + 2 && p.y + p.h >= y && p.x + p.w > x && p.x < x + w) { p.y = y - p.h; p.vy = 0; p.chao = true; }
  const golpeBox = p.atq > 0 ? { x: p.face > 0 ? p.x + p.w - 6 : p.x - 62, y: p.y + 8, w: 68, h: 68 } : null;
  const corpo = { x: p.x + 8, y: p.y + 6, w: p.w - 16, h: p.h - 6 };

  /* Inimigos */
  spawn -= dt;
  if (spawn <= 0) {
    spawn = F.intervalo * rnd(0.7, 1.2);
    const tipo = F.tipos[Math.floor(Math.random() * F.tipos.length)], d = DEF[tipo], lado = Math.random() < 0.5 ? -1 : 1;
    const y = tipo === "medo" ? rnd(150, 350) : CHAO - d.h;
    inimigos.push({ tipo, ...d, v: d.v * (1 + fase * 0.18), x: lado < 0 ? -60 : L + 10, y, base: y, ph: rnd(0, 6), dir: -lado, flash: 0, golpe: -1 });
  }
  for (const e of inimigos) {
    if (e.tipo !== "medo") e.dir = p.x > e.x ? 1 : -1;
    e.x += e.dir * e.v * dt; e.flash -= dt;
    if (e.tipo === "medo") e.y = e.base + Math.sin(tempo * 3 + e.ph) * 50;
    if (golpeBox && e.golpe !== golpe && choque(golpeBox, e)) { e.hp--; e.golpe = golpe; e.flash = 0.15; e.x += p.face * 26; if (e.hp <= 0) score += e.pts; }
    if (choque(corpo, e) && e.hp > 0) dano();
  }
  inimigos = inimigos.filter((e) => e.hp > 0 && e.x > -120 && e.x < L + 120);

  /* Chefão */
  if (boss) {
    boss.x += boss.dir * (60 + (boss.max - boss.hp) * 3) * dt; boss.flash -= dt;
    if (boss.x < 380) boss.dir = 1; if (boss.x > L - boss.w - 10) boss.dir = -1;
    boss.tiro -= dt;
    if (boss.tiro <= 0) { boss.tiro = boss.hp > boss.max / 2 ? 2.2 : 1.3; tiros.push({ x: boss.x, y: Math.random() < 0.5 ? CHAO - 130 : CHAO - 30, w: 34, h: 26, vx: -(270 + (boss.max - boss.hp) * 6) }); }
    if (golpeBox && boss.golpe !== golpe && choque(golpeBox, boss)) { boss.hp--; boss.golpe = golpe; boss.flash = 0.12; score += 25; if (boss.hp <= 0) { score += 1000; fim(true); } }
    if (choque(corpo, boss)) dano();
  }
  for (const s of tiros) {
    s.x += s.vx * dt;
    if (golpeBox && choque(golpeBox, s)) { s.x = -999; score += 10; }
    else if (choque(corpo, s)) { s.x = -999; dano(); }
  }
  tiros = tiros.filter((s) => s.x > -100);

  /* Camisetas */
  spawnItem -= dt;
  if (spawnItem <= 0) {
    spawnItem = F.boss ? 6 : rnd(1.4, 2.6);
    const bases = [CHAO, ...F.plat.map((q) => q[1])], i = Math.floor(Math.random() * bases.length), q = F.plat[i - 1];
    itens.push({ x: q ? rnd(q[0], q[0] + q[2] - 34) : rnd(40, L - 80), y: bases[i] - 40, w: 34, h: 34, vida: 9 });
  }
  for (const it of itens) {
    it.vida -= dt;
    if (choque(p, it)) {
      it.vida = 0; score += 100;
      if (F.boss) p.vida = Math.min(3, p.vida + 1);
      else if (++got >= F.meta) { score += 300; fase < 2 ? iniciarFase(fase + 1) : fim(true); return; }
    }
  }
  itens = itens.filter((it) => it.vida > 0);
}

/* ---------- Desenho ---------- */
function texto(s, x, y, tam, cor = "#fff", alinha = "center") {
  cx.font = `${tam}px ${FONTE}`; cx.textAlign = alinha; cx.fillStyle = cor; cx.fillText(s, x, y);
}

function cenario(prog) {
  const g = cx.createLinearGradient(0, 0, 0, A);
  g.addColorStop(0, F.ceu[0]); g.addColorStop(1, F.ceu[1]);
  cx.fillStyle = g; cx.fillRect(0, 0, L, A);
  cx.fillStyle = "rgba(255,240,200,.85)"; cx.beginPath(); cx.arc(150, 110, 38, 0, 7); cx.fill();
  cx.fillStyle = F.pred;
  for (const b of predios) { const x = (((b.x - tempo * 6) % 1260) + 1260) % 1260 - 120; cx.fillRect(x, CHAO - b.h, b.w, b.h); }
  /* Loja: o portão sobe conforme o progresso */
  cx.fillStyle = "#15110a"; cx.fillRect(770, CHAO - 210, 180, 210);
  cx.fillStyle = "#c6a15b"; cx.fillRect(770, CHAO - 210, 180, 6);
  texto("MK IMPORTS", 860, CHAO - 168, 22, "#c6a15b");
  cx.fillStyle = "#ffd98a"; cx.fillRect(800, CHAO - 130, 120, 130);
  cx.fillStyle = "#6b6b6b"; cx.fillRect(800, CHAO - 130, 120, 130 * (1 - prog));
  cx.fillStyle = "#0b0b0b"; cx.fillRect(0, CHAO, L, A - CHAO);
  cx.fillStyle = "#c6a15b"; cx.fillRect(0, CHAO, L, 3);
  for (const [x, y, w] of F.plat) { cx.fillStyle = "#1c1810"; cx.fillRect(x, y, w, 14); cx.fillStyle = "#c6a15b"; cx.fillRect(x, y, w, 3); }
}

function jogador() {
  if (p.inv > 0 && Math.floor(p.inv * 14) % 2) return;
  const acao = p.atq > 0 ? "atacar" : !p.chao ? "pular" : Math.abs(p.vx) > 1 ? "andar" : "parado";
  let anim = ANIMACOES[acao], quadros = anim.imgs.filter(pronto);
  if (!quadros.length && acao === "parado") { anim = ANIMACOES.andar; quadros = anim.imgs.filter(pronto).slice(0, 1); } // sem "parado": usa o 1º quadro de "andar"
  let im = null;
  if (quadros.length) {
    let f = 0;
    if (acao === "parado" && quadros.length > 1) f = Math.floor(tempo * anim.fps) % quadros.length;
    if (acao === "andar") f = Math.floor(tempo * anim.fps) % quadros.length;
    if (acao === "pular") f = Math.floor(Math.min(0.999, Math.max(0, (p.vy + 830) / 1660)) * quadros.length);
    if (acao === "atacar") f = Math.min(quadros.length - 1, Math.floor((1 - p.atq / ATQ_DURACAO) * quadros.length));
    im = quadros[f];
  }
  cx.save(); cx.translate(p.x + p.w / 2, p.y + p.h); cx.scale(p.face, 1);
  if (im) { const h = ALTURA_SPRITE, w = (im.naturalWidth / im.naturalHeight) * h; cx.drawImage(im, -w / 2, -h, w, h); }
  else {
    const passo = acao === "andar" ? Math.sin(tempo * 16) * 10 : 0;
    cx.fillStyle = "#222"; cx.fillRect(-14 + passo, -30, 12, 30); cx.fillRect(2 - passo, -30, 12, 30);
    cx.fillStyle = "#111"; cx.fillRect(-20, -70, 40, 42);
    cx.fillStyle = "#c6a15b"; cx.fillRect(-20, -52, 40, 5);
    cx.fillStyle = "#e8b890"; cx.beginPath(); cx.arc(0, -82, 13, 0, 7); cx.fill();
    cx.fillStyle = "#111"; cx.fillRect(-14, -98, 28, 8);
    cx.fillStyle = "#c6a15b"; cx.fillRect(20, acao === "atacar" ? -62 : -58, acao === "atacar" ? 44 : 10, 8);
  }
  if (p.atq > 0) { cx.strokeStyle = `rgba(255,220,130,${p.atq / ATQ_DURACAO})`; cx.lineWidth = 8; cx.beginPath(); cx.arc(28, -48, 50, -1.1, 1.1); cx.stroke(); }
  cx.restore();
}

function inimigo(e) {
  cx.save(); cx.globalAlpha = e.flash > 0 ? 0.5 : 1;
  if (e.tipo === "conta") {
    cx.fillStyle = "#fff"; cx.fillRect(e.x, e.y, e.w, e.h); cx.strokeStyle = "#c0392b"; cx.lineWidth = 3; cx.strokeRect(e.x, e.y, e.w, e.h);
    texto("R$", e.x + e.w / 2, e.y + 32, 24, "#c0392b");
  } else if (e.tipo === "medo") {
    cx.fillStyle = "rgba(235,235,255,.9)"; cx.beginPath(); cx.arc(e.x + e.w / 2, e.y + 20, 22, Math.PI, 0); cx.lineTo(e.x + e.w, e.y + e.h);
    for (let i = 3; i >= 0; i--) cx.lineTo(e.x + (i * e.w) / 4 + (i % 2 ? 0 : 6), e.y + e.h - (i % 2 ? 0 : 10));
    cx.fill(); cx.fillStyle = "#111"; cx.fillRect(e.x + 12, e.y + 14, 7, 10); cx.fillRect(e.x + 29, e.y + 14, 7, 10);
  } else {
    cx.fillStyle = "#2b2b36"; cx.fillRect(e.x, e.y + 22, e.w, e.h - 22); cx.fillStyle = "#e8b890"; cx.beginPath(); cx.arc(e.x + e.w / 2, e.y + 14, 14, 0, 7); cx.fill();
    cx.fillStyle = "#c0392b"; cx.fillRect(e.x + 22, e.y + 30, 6, 28); texto("FISCO", e.x + e.w / 2, e.y - 6, 16, "#ffd98a");
  }
  cx.restore();
}

function chefe() {
  const b = boss; cx.save(); cx.globalAlpha = b.flash > 0 ? 0.55 : 1;
  cx.fillStyle = "#f4efe2"; cx.fillRect(b.x, b.y, b.w, b.h); cx.strokeStyle = "#8b0f1f"; cx.lineWidth = 6; cx.strokeRect(b.x, b.y, b.w, b.h);
  texto("BOLETO", b.x + b.w / 2, b.y + 56, 34, "#8b0f1f");
  cx.fillStyle = "#8b0f1f"; cx.fillRect(b.x + 28, b.y + 80, 30, 10); cx.fillRect(b.x + 92, b.y + 80, 30, 10);
  cx.fillRect(b.x + 40, b.y + 130, 70, 12); texto("VENCIDO!", b.x + b.w / 2, b.y + 172, 22, "#8b0f1f");
  cx.restore();
}

function camiseta(it) {
  const y = it.y + Math.sin(tempo * 4 + it.x) * 4;
  if (it.vida < 3 && Math.floor(it.vida * 8) % 2) return;
  cx.fillStyle = "#c6a15b"; cx.beginPath();
  cx.moveTo(it.x + 8, y); cx.lineTo(it.x, y + 9); cx.lineTo(it.x + 6, y + 15); cx.lineTo(it.x + 9, y + 12); cx.lineTo(it.x + 9, y + 34);
  cx.lineTo(it.x + 25, y + 34); cx.lineTo(it.x + 25, y + 12); cx.lineTo(it.x + 28, y + 15); cx.lineTo(it.x + 34, y + 9); cx.lineTo(it.x + 26, y); cx.lineTo(it.x + 17, y + 6); cx.fill();
}

function hud() {
  texto("♥".repeat(Math.max(0, p.vida)), 20, 44, 34, "#e74c3c", "left");
  texto(String(score).padStart(6, "0"), L - 20, 44, 34, "#fff", "right");
  texto(F.nome, L / 2, 30, 18, "#c6a15b");
  cx.fillStyle = "rgba(0,0,0,.6)"; cx.fillRect(L / 2 - 150, 42, 300, 14);
  const pct = boss ? boss.hp / boss.max : got / F.meta;
  cx.fillStyle = boss ? "#c0392b" : "#c6a15b"; cx.fillRect(L / 2 - 150, 42, 300 * (boss ? pct : Math.min(1, pct)), 14);
  texto(boss ? "BOLETO GIGANTE" : `LOJA ${got}/${F.meta}`, L / 2, 76, 16, "#fff");
}

function tela(titulo, sub, linhas = []) {
  cx.fillStyle = "rgba(0,0,0,.72)"; cx.fillRect(0, 0, L, A);
  texto(titulo, L / 2, 220, 72, "#c6a15b"); texto(sub, L / 2, 270, 22);
  linhas.forEach((l, i) => texto(l, L / 2, 330 + i * 34, 20, "rgba(255,255,255,.8)"));
}

function desenhar() {
  const prog = estado === "menu" ? 0 : boss ? 1 - boss.hp / boss.max : got / (F.meta || 1);
  if (estado === "menu") F = FASES[0];
  cenario(estado === "fim" && vitoria ? 1 : Math.min(1, prog));
  if (estado !== "menu") {
    itens.forEach(camiseta); inimigos.forEach(inimigo); if (boss) chefe();
    cx.fillStyle = "#ffd98a"; tiros.forEach((s) => { cx.beginPath(); cx.arc(s.x + 13, s.y + 13, 13, 0, 7); cx.fill(); texto("$", s.x + 13, s.y + 21, 20, "#8b0f1f"); });
    jogador(); hud();
  }
  if (estado === "menu") tela("ABRA A LOJA", "Pegue as camisetas antes que o aperto da vida de lojista te pegue", ["ENTER ou toque na tela para jogar", "A/D mover · ESPAÇO pular · J atacar"]);
  if (estado === "intro") tela(F.nome, F.dica);
  if (estado === "fim") tela(vitoria ? "LOJA ABERTA!" : "FIM DE JOGO", `Pontos: ${score}`, ["ENTER ou toque para jogar de novo"]);
}

let ultimo = 0;
function loop(ts) { const dt = Math.min(0.033, (ts - ultimo) / 1000 || 0); ultimo = ts; atualizar(dt); desenhar(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);