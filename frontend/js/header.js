
const hero = document.querySelector(".hero");
const video = document.querySelector(".hero-video");
const thumbnail = document.querySelector(".hero-thumbnail");
const fonte = video?.querySelector("source");

if (hero && video && thumbnail && fonte) {

  const comunicarPreloader = (estado) => {

    video.dataset.estado = estado;

    window.dispatchEvent(
      new CustomEvent("hero:video-pronto", {
        detail: { estado }
      })
    );

  };

  const iniciarVideo = () => {

    if (video.dataset.iniciado === "true") return;

    video.dataset.iniciado = "true";

    // Prepara os eventos antes de iniciar o carregamento.
    video.addEventListener("canplay", async () => {

      try {

        await video.play();

        video.classList.add("video-pronto");
        thumbnail.classList.add("thumbnail-oculta");

        comunicarPreloader("pronto");

      } catch (erro) {

        console.warn("Autoplay não iniciado:", erro);

        // A thumbnail continua visível.
        comunicarPreloader("fallback");

      }

    }, { once: true });

    video.addEventListener("error", () => {

      console.warn("Erro ao carregar o vídeo.");

      comunicarPreloader("fallback");

    }, { once: true });

    // Libera o carregamento do vídeo.
    fonte.src = fonte.dataset.src;
    fonte.removeAttribute("data-src");

    video.preload = "auto";
    video.load();

  };

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
