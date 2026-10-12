import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { precio } from "../api";
import { useTienda } from "../tienda";
import Icono from "./Icono";

// Foto de la prenda. Si el link no carga, muestra un bloque del color de la prenda.
export function FotoPrenda({ src, alt, hex = "#FFD3E8", className = "" }) {
  const [fallo, setFallo] = useState(false);
  if (!src || fallo) {
    return (
      <div className={`foto foto--vacia ${className}`} style={{ "--color-prenda": hex }} role="img" aria-label={alt}>
        <Icono nombre="perchero" tam={40} grosor={1.6} />
      </div>
    );
  }
  return <img className={`foto ${className}`} src={src} alt={alt} loading="lazy" onError={() => setFallo(true)} />;
}

export function Puntos({ colores, max = 4 }) {
  return (
    <span className="puntos" aria-label={`${colores.length} colores`}>
      {colores.slice(0, max).map((c) => (
        <span key={c.id} className="punto" style={{ background: c.hex }} title={c.nombre} />
      ))}
      {colores.length > max && <span className="puntos__mas">+{colores.length - max}</span>}
    </span>
  );
}

export function Tarjeta({ producto, ancha = false }) {
  const p = producto;
  const hex = p.colores[0]?.hex;
  return (
    <Link to={`/producto/${p.id}`} className={`tarjeta ${ancha ? "tarjeta--ancha" : ""}`}>
      <div className="tarjeta__foto">
        <FotoPrenda src={p.imagen_url} alt={p.nombre} hex={hex} />
      </div>
      <div className="tarjeta__info">
        <span className="tarjeta__nombre">{p.nombre}</span>
        <span className="tarjeta__fila">
          <span className="tarjeta__precio">{precio(p.precio)}</span>
          <Puntos colores={p.colores} max={3} />
        </span>
      </div>
    </Link>
  );
}

export function Encabezado({ titulo, volver = true, derecha }) {
  const navegar = useNavigate();
  return (
    <header className="encabezado">
      {volver ? (
        <button className="boton-icono" onClick={() => navegar(-1)} aria-label="Volver">
          <Icono nombre="atras" />
        </button>
      ) : <span className="boton-icono boton-icono--fantasma" />}
      <h1 className="encabezado__titulo">{titulo}</h1>
      {derecha || <span className="boton-icono boton-icono--fantasma" />}
    </header>
  );
}

export function BarraTabs() {
  const { carrito, perchero } = useTienda();
  const tabs = [
    { a: "/", icono: "inicio", texto: "Inicio" },
    { a: "/buscar", icono: "buscar", texto: "Buscar" },
    { a: "/probador", icono: "perchero", texto: "Probador", badge: perchero.length },
    { a: "/carrito", icono: "bolsa", texto: "Carrito", badge: carrito?.cantidad_total },
  ];
  return (
    <nav className="tabs" aria-label="Secciones">
      {tabs.map((t) => (
        <NavLink key={t.a} to={t.a} end={t.a === "/"} className={({ isActive }) => `tab ${isActive ? "tab--activa" : ""}`}>
          <span className="tab__icono">
            <Icono nombre={t.icono} />
            {t.badge > 0 && <span className="badge">{t.badge}</span>}
          </span>
          <span className="tab__texto">{t.texto}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function Aviso() {
  const { aviso } = useTienda();
  if (!aviso) return null;
  return (
    <div key={aviso.id} className={`aviso aviso--${aviso.tipo}`} role="status">
      {aviso.tipo === "ok" && <Icono nombre="check" tam={18} grosor={2.6} />}
      {aviso.texto}
    </div>
  );
}

export function Cargando({ texto = "Cargando…" }) {
  return (
    <div className="cargando" role="status">
      <span className="cargando__punto" /><span className="cargando__punto" /><span className="cargando__punto" />
      <span className="sr">{texto}</span>
    </div>
  );
}

export function Vacio({ icono, titulo, texto, accion }) {
  return (
    <div className="vacio">
      <div className="vacio__icono"><Icono nombre={icono} tam={40} grosor={1.8} /></div>
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
      {accion}
    </div>
  );
}

export function ErrorCarga({ error, reintentar }) {
  return (
    <Vacio
      icono="cerrar"
      titulo="Ups, no cargó"
      texto={error?.message}
      accion={reintentar && <button className="boton boton--secundario" onClick={reintentar}>Probar de nuevo</button>}
    />
  );
}
