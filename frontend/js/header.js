const hero = document.querySelector(".hero");
const video = document.querySelector(".hero-video");
const thumbnail = document.querySelector(".hero-thumbnail");
const fonte = video?.querySelector("source");

if (hero && video && thumbnail && fonte) {
  const iniciarVideo = () => {
    // Evita iniciar o carregamento mais de uma vez.
    if (video.dataset.iniciado === "true") return;

    video.dataset.iniciado = "true";

    // Libera a URL real do vídeo somente agora.
    fonte.src = fonte.dataset.src;

    video.load();

    video.addEventListener("canplay", async () => {
      try {
        await video.play();

        // Só revela o vídeo depois que a reprodução começar.
        video.classList.add("video-pronto");
        thumbnail.classList.add("thumbnail-oculta");
      } catch (erro) {
        // Se a reprodução automática falhar,
        // a thumbnail continua visível.
        console.warn("Não foi possível iniciar o vídeo:", erro);
      }
    }, { once: true });
  };

  // Inicia quando o header estiver próximo da área visível.
  if ("IntersectionObserver" in window) {
    const observador = new IntersectionObserver((entradas) => {
      if (entradas.some(entrada => entrada.isIntersecting)) {
        iniciarVideo();
        observador.disconnect();
      }
    });

    observador.observe(hero);
  } else {
    iniciarVideo();
  }
}