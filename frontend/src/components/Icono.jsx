// Íconos de trazo, mismos que en el Figma (24×24, trazo 2).
const RUTAS = {
  inicio: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-5h4v5" /></>,
  buscar: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  perchero: <><path d="M12 7.5a2 2 0 1 0-2-2" /><path d="M12 7.5v1.2L3.6 15.1A1.6 1.6 0 0 0 4.6 18h14.8a1.6 1.6 0 0 0 1-2.9L12 8.7" /></>,
  bolsa: <><path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  atras: <path d="M15 5l-7 7 7 7" />,
  adelante: <path d="m9 5 7 7-7 7" />,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  basura: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>,
  filtro: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
  regla: <><rect x="2.5" y="8" width="19" height="8" rx="1.5" /><path d="M7 8v3M11 8v4M15 8v3M19 8v3" /></>,
  camara: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  chispas: <><path d="M10 3.5 11.6 8.4 16.5 10l-4.9 1.6L10 16.5 8.4 11.6 3.5 10l4.9-1.6Z" /><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8Z" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  camion: <><path d="M3 6h11v10H3z" /><path d="M14 9h4l3 3.5V16h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  tienda: <><path d="M4 9.5 5.5 4h13L20 9.5" /><path d="M4 9.5h16v1a3 3 0 0 1-5.3 1.9 3 3 0 0 1-5.4 0A3 3 0 0 1 4 10.5Z" /><path d="M5.5 13v7h13v-7" /></>,
  tarjeta: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  estrella: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9Z" />,
};

export default function Icono({ nombre, tam = 24, grosor = 2, className = "", titulo }) {
  return (
    <svg
      width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden={titulo ? undefined : true} role={titulo ? "img" : undefined}
    >
      {titulo && <title>{titulo}</title>}
      {RUTAS[nombre]}
    </svg>
  );
}
