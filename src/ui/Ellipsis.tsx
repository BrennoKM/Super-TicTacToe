import { useEffect, useState } from 'react';

// Reticências animadas ("..." > "." > ".." > "..."), usadas em todo texto de
// espera (conectando, aguardando adversário, reconectando, gerando GIF, etc).
// Decorativa: o texto de status em si já carrega o significado pra leitor de
// tela, então isso fica marcado como aria-hidden.
const FRAMES = ['...', '.', '..'];
const FRAME_MS = 450;

export function Ellipsis() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), FRAME_MS);
    return () => clearInterval(id);
  }, []);

  return <span aria-hidden="true">{FRAMES[frame]}</span>;
}
