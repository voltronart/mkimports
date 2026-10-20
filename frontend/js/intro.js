
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

  // Bloqueia a rolagem durante a abertura
  document.documentElement.style.overflow = "hidden";

  gsap.set(
    [logo, assinatura, identificacao, rodape],
    { autoAlpha: 0 }
  );

  gsap.set(logo, { y: 35, scale: 0.92 });
  gsap.set(assinatura, { y: 12 });
  gsap.set(identificacao, { y: -10 });
  gsap.set(rodape, { y: 10 });

  gsap.set(circulo, {
    strokeDasharray: comprimentoCirculo,
    strokeDashoffset: comprimentoCirculo
  });

  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    onComplete: () => {
      // Garante que o progresso termine exatamente em 100%
      percentual.textContent = "100%";
      status.textContent = "WELCOME";

      // Revela o site
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
  });

  // Movimento cinematográfico da imagem
  tl.to(fundo, {
    scale: 1,
    duration: 4.8,
    ease: "power2.out"
  }, 0);

  // Luz varre a imagem
  tl.fromTo(luz,
    { opacity: 0.45 },
    { opacity: 1, duration: 2.2, ease: "sine.inOut" },
    0
  );

  // Identificação editorial
  tl.to(identificacao, {
    autoAlpha: 1,
    y: 0,
    duration: 0.7
  }, 0.35);

  // Logo aparece com impacto
  tl.to(logo, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: 1.1,
    ease: "power4.out"
  }, 0.8);

  tl.to(assinatura, {
    autoAlpha: 1,
    y: 0,
    duration: 0.8
  }, 1.3);

  // Contador sincronizado com o tempo da intro
  tl.to(progresso, {
    valor: 100,
    duration: 4.8,
    ease: "none",
    onUpdate: () => {
      const valor = Math.floor(progresso.valor);

      percentual.textContent =
        `${String(valor).padStart(2, "0")}%`;

      circulo.style.strokeDashoffset =
        comprimentoCirculo * (1 - progresso.valor / 100);
    },
    onComplete: () => {
      percentual.textContent = "100%";
      circulo.style.strokeDashoffset = 0;
    }
  }, 0);

  tl.to(rodape, {
    autoAlpha: 1,
    y: 0,
    duration: 0.7
  }, 1.6);

  // Efeito de flash sutil próximo do final
  tl.to(luz, {
    opacity: 0.65,
    duration: 0.15,
    yoyo: true,
    repeat: 1
  }, 4.35);
}
