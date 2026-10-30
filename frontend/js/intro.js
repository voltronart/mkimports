
const intro = document.querySelector(".intro");

if (intro && window.gsap) {

  const fundo = intro.querySelector(".intro-fundo");
  const luz = intro.querySelector(".intro-luz");
  const logo = intro.querySelector(".intro-logo");
  const assinatura = intro.querySelector(".intro-assinatura");
  const identificacao = intro.querySelector(".intro-identificacao");
  const rodape = intro.querySelector(".intro-rodape");
  const percentual = intro.querySelector(".intro-percentual");
  const circulo = intro.querySelector(".intro-circulo-valor");
  const status = intro.querySelector(".intro-status");

  const progresso = { valor: 0 };
  const comprimentoCirculo = 2 * Math.PI * 44;

  let animacaoConcluida = false;
  let carregamentoConcluido = false;
  let finalizando = false;
  let tweenProgresso = null;

  // Bloqueia a rolagem durante a intro
  document.documentElement.style.overflow = "hidden";

  if (status) status.textContent = "LOADING";

  gsap.set(
    [logo, assinatura, identificacao, rodape],
    { autoAlpha: 0 }
  );
  gsap.set(fundo, { scale: 1.05 });
  gsap.set(logo, { y: 35, scale: 0.92 });
  gsap.set(assinatura, { y: 12 });
  gsap.set(identificacao, { y: -10 });
  gsap.set(rodape, { y: 10 });

  gsap.set(circulo, {
    strokeDasharray: comprimentoCirculo,
    strokeDashoffset: comprimentoCirculo
  });

  // Atualiza visualmente o percentual
  function atualizarProgresso(valor) {

    if (tweenProgresso) {
      tweenProgresso.kill();
    }

    tweenProgresso = gsap.to(progresso, {
      valor,
      duration: 0.4,
      ease: "power2.out",

      onUpdate: () => {

        const valorAtual = Math.floor(progresso.valor);

        percentual.textContent =
          `${String(valorAtual).padStart(2, "0")}%`;

        circulo.style.strokeDashoffset =
          comprimentoCirculo * (1 - progresso.valor / 100);

      }
    });
  }

  // Aguarda uma imagem e sua decodificação
  function aguardarImagem(img) {

    return new Promise(resolve => {

      const concluir = () => resolve();

      if (img.complete) {

        if (img.naturalWidth > 0 && img.decode) {
          img.decode().then(concluir).catch(concluir);
        } else {
          concluir();
        }

        return;
      }

      img.addEventListener("load", concluir, { once: true });
      img.addEventListener("error", concluir, { once: true });

      // Evita bloqueio indefinido
      setTimeout(concluir, 10000);

    });
  }

 


function aguardarHero() {

  const videoHero = document.querySelector(".hero-video");

  if (!videoHero) {
    return Promise.resolve();
  }

  // Caso o vídeo já esteja pronto ou tenha fallback.
  if (
    videoHero.dataset.estado === "pronto" ||
    videoHero.dataset.estado === "fallback"
  ) {
    return Promise.resolve();
  }

  return new Promise(resolve => {

    const concluir = () => {
      clearTimeout(temporizador);
      window.removeEventListener(
        "hero:video-pronto",
        receberEvento
      );
      resolve();
    };

    const receberEvento = () => {
      concluir();
    };

    window.addEventListener(
      "hero:video-pronto",
      receberEvento
    );

    // Não deixa o vídeo bloquear a entrada indefinidamente.
    const temporizador = setTimeout(concluir, 10000);

  });

}



  // Identifica os recursos necessários para a primeira tela
  function obterRecursos() {

    const recursos = [];

    // Logo da intro
 const logoImagem = intro.querySelector(".intro-logo img");

 if (logoImagem) {
  recursos.push(() => aguardarImagem(logoImagem));
}

    // Imagem de fundo da intro
    const imagemFundo = new Image();
    imagemFundo.src = new URL(
      "../assets/intro.jpg",
      document.querySelector('link[rel="stylesheet"][href*="intro.css"]')?.href
      || window.location.href
    ).href;

    recursos.push(() => aguardarImagem(imagemFundo));

    // Imagens visíveis na primeira tela
    const imagens = [...document.images].filter(img => {

      const retangulo = img.getBoundingClientRect();

      const visivel =
        retangulo.width > 0 &&
        retangulo.height > 0 &&
        retangulo.top < window.innerHeight &&
        retangulo.bottom > 0;

      return visivel && img.loading !== "lazy";

    });

    imagens.forEach(img => {
      recursos.push(() => aguardarImagem(img));
    });

    // Vídeos presentes na primeira tela
    const videos = [...document.querySelectorAll("video")].filter(video => {

      const retangulo = video.getBoundingClientRect();

      return (
        retangulo.width > 0 &&
        retangulo.height > 0 &&
        retangulo.top < window.innerHeight &&
        retangulo.bottom > 0
      );

    });

    // Aguarda o resultado do carregamento do Hero
    recursos.push(() => aguardarHero());

    // Fontes utilizadas pelo site
    recursos.push(() => Promise.race([
      document.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 4000))
    ]));

    return recursos;
  }

  // Controla o carregamento real dos recursos
  async function carregarRecursos() {

    const recursos = obterRecursos();

    const total = recursos.length;
    let concluidos = 0;

    const tarefas = recursos.map(async tarefa => {

      try {
        await tarefa();
      } catch (erro) {
        console.warn("Falha ao preparar recurso:", erro);
      }

      concluidos++;

      const porcentagem = Math.round(
        (concluidos / total) * 100
      );

      atualizarProgresso(porcentagem);

    });

    await Promise.all(tarefas);

    carregamentoConcluido = true;

    atualizarProgresso(100);

    finalizarIntro();

  }

  // Só libera o site quando animação e carregamento terminarem
  function finalizarIntro() {

    if (
      !animacaoConcluida ||
      !carregamentoConcluido ||
      finalizando
    ) {
      return;
    }

    finalizando = true;

    if (percentual) percentual.textContent = "100%";
    if (status) status.textContent = "WELCOME";

    gsap.to(intro, {
      yPercent: -100,
      duration: 1.1,
      ease: "power4.inOut",
      delay: 0.35,

      onComplete: () => {

        intro.remove();

        document.documentElement.style.overflow = "";

      }
    });

  }

  // Animação cinematográfica original
  const tl = gsap.timeline({

    defaults: {
      ease: "power3.out"
    },

    onComplete: () => {

      animacaoConcluida = true;

      finalizarIntro();

    }

  });

  // Movimento do fundo
  tl.to(fundo, {
    scale: 1,
    duration: 4.8,
    ease: "power2.out"
  }, 0);

  // Luz
  tl.fromTo(luz,
    { opacity: 0.45 },
    {
      opacity: 1,
      duration: 2.2,
      ease: "sine.inOut"
    },
    0
  );

  // Identificação
  tl.to(identificacao, {
    autoAlpha: 1,
    y: 0,
    duration: 0.7
  }, 0.35);

  // Logo
  tl.to(logo, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: 1.1,
    ease: "power4.out"
  }, 0.8);

  // Assinatura
  tl.to(assinatura, {
    autoAlpha: 1,
    y: 0,
    duration: 0.8
  }, 1.3);

  // Rodapé
  tl.to(rodape, {
    autoAlpha: 1,
    y: 0,
    duration: 0.7
  }, 1.6);

  // Flash sutil
  tl.to(luz, {
    opacity: 0.65,
    duration: 0.15,
    yoyo: true,
    repeat: 1
  }, 4.35);

  // Inicia o carregamento em paralelo à animação
  carregarRecursos();

}
