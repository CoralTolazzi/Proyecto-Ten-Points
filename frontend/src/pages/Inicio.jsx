import { Link } from "react-router-dom";
import { api, NOMBRE_CATEGORIA } from "../api";
import { Cargando, ErrorCarga, FotoPrenda, Tarjeta } from "../components/Comunes";
import Chica from "../components/Chica";
import Icono from "../components/Icono";
import { useCarga } from "../useCarga";

const SECCIONES = [
  { categoria: "remeras", titulo: "Remeras que van con todo" },
  { categoria: "vestidos", titulo: "Vestidos para el finde" },
  { categoria: "pantalones", titulo: "Jeans y pantalones" },
  { categoria: "buzos", titulo: "Buzos y canguros" },
  { categoria: "polleras", titulo: "Polleras" },
  { categoria: "camperas", titulo: "Camperas" },
];

function Fila({ categoria, titulo }) {
  const { datos, error } = useCarga(() => api.productos({ categoria, por_pagina: 8 }), [categoria]);
  if (error) return null;
  return (
    <section className="seccion">
      <div className="seccion__cabeza">
        <h2 className="seccion__titulo">{titulo}</h2>
        <Link className="link-chico" to={`/buscar?categoria=${categoria}`}>Ver todo</Link>
      </div>
      {!datos ? <Cargando /> : (
        <div className="carrusel">
          {datos.items.map((p) => <Tarjeta key={p.id} producto={p} />)}
        </div>
      )}
    </section>
  );
}

export default function Inicio() {
  const cats = useCarga(() => api.categorias(), []);

  return (
    <main className="pantalla">
      <header className="inicio__cabeza">
        <div>
          <span className="logo">Ten Points</span>
          <span className="logo__by">by Lucas y Coral</span>
        </div>
        <Link to="/carrito" className="boton-icono" aria-label="Ir al carrito"><Icono nombre="bolsa" /></Link>
      </header>

      <Link to="/buscar" className="buscador-falso">
        <Icono nombre="buscar" tam={20} />
        <span>Buscá remeras, jeans, colores…</span>
      </Link>

      <section className="banner">
        <div className="banner__texto">
          <span className="sticker">NUEVO</span>
          <h2 className="banner__titulo">Probátelo<br />antes de<br />comprar</h2>
          <p>Colgá lo que te guste en tu perchero y probalo con IA.</p>
          <Link to="/probador" className="boton boton--oscuro boton--chico">
            <Icono nombre="chispas" tam={18} /> Ir al probador
          </Link>
        </div>
        <span className="banner__deco banner__deco--1" />
        <span className="banner__deco banner__deco--2" />
        <Chica cual="inicio" className="banner__chica" />
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">Categorías</h2>
        {cats.error ? <ErrorCarga error={cats.error} reintentar={cats.reintentar} /> : !cats.datos ? <Cargando /> : (
          <div className="categorias">
            {cats.datos.map((c, i) => (
              <Link key={c.categoria} to={`/buscar?categoria=${c.categoria}`} className={`categoria categoria--${i % 6}`}>
                <span className="categoria__foto"><FotoPrenda src={c.imagen_url} alt="" /></span>
                <span className="categoria__nombre">{NOMBRE_CATEGORIA[c.categoria]}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {cats.datos && SECCIONES.map((s) => <Fila key={s.categoria} {...s} />)}
    </main>
  );
}
