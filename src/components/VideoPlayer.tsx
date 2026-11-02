/**
 * Player de vídeo embutido (YouTube "não listado" ou Shorts).
 * Aceita vários formatos de link; se não reconhecer, cai para link externo.
 * Adapta o formato: vertical (9:16) para Shorts, horizontal (16:9) para o resto.
 * Usa youtube-nocookie (modo privacidade).
 */

function parseYoutube(url: string): { id: string; vertical: boolean } | null {
  const vertical = /\/shorts\//.test(url);
  const padroes = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/live\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of padroes) {
    const m = url.match(p);
    if (m) return { id: m[1], vertical };
  }
  const limpo = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(limpo)) return { id: limpo, vertical: false };
  return null;
}

export function VideoPlayer({
  url,
  titulo,
}: {
  url: string;
  titulo?: string;
}) {
  const info = parseYoutube(url);

  if (!info) {
    // Formato não reconhecido → abre o link original em nova aba.
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primario mt-6 inline-block text-center"
      >
        ▶ Assistir ao vídeo
      </a>
    );
  }

  const src = `https://www.youtube-nocookie.com/embed/${info.id}?rel=0&modestbranding=1`;
  const wrapper = info.vertical
    ? "mt-6 mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-2xl bg-black"
    : "mt-6 aspect-video w-full overflow-hidden rounded-2xl bg-black";

  return (
    <div className={wrapper}>
      <iframe
        src={src}
        title={titulo ?? "Vídeo da atividade"}
        className="h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
