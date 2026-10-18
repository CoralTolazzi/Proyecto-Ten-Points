import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, NOMBRE_CATEGORIA, precio } from "../api";
import { Cargando, ErrorCarga, Tarjeta, Vacio } from "../components/Comunes";
import { TarjetaChica } from "../components/Chica";
import Icono from "../components/Icono";
import { useCarga } from "../useCarga";

const POR_PAGINA = 20;
const ORDENES = [
  ["relevancia", "Relevancia"], ["precio_asc", "Menor precio"], ["precio_desc", "Mayor precio"], ["nombre", "A–Z"],
];

function HojaFiltros({ filtros, valores, aplicar, cerrar }) {
  const [color, setColor] = useState(valores.color);
  const [talle, setTalle] = useState(valores.talle);
  const [tope, setTope] = useState(valores.precio_max || filtros.precio_max);
  const [orden, setOrden] = useState(valores.orden);
  const alternar = (lista, setLista, v) => setLista(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  return (
    <div className="hoja-fondo" onClick={cerrar}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label="Filtros" onClick={(e) => e.stopPropagation()}>
        <div className="hoja__cabeza">
          <h2>Filtros</h2>
          <button className="boton-icono" onClick={cerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
        </div>

        <h3 className="etiqueta">Ordenar</h3>
        <div className="chips">
          {ORDENES.map(([v, t]) => (
            <button key={v} className={`chip ${orden === v ? "chip--activo" : ""}`} onClick={() => setOrden(v)}>{t}</button>
          ))}
        </div>

        <h3 className="etiqueta">Color</h3>
        <div className="muestras">
          {filtros.colores.map((c) => (
            <button key={c.nombre} className={`muestra ${color.includes(c.nombre) ? "muestra--activa" : ""}`}
              onClick={() => alternar(color, setColor, c.nombre)} aria-pressed={color.includes(c.nombre)}>
              <span className="muestra__circulo" style={{ background: c.hex }} />
              <span className="muestra__nombre">{c.nombre}</span>
            </button>
          ))}
        </div>

        <h3 className="etiqueta">Talle</h3>
        <div className="chips">
          {[...filtros.talles_letras, ...filtros.talles_numericos].map((t) => (
            <button key={t} className={`chip chip--talle ${talle.includes(t) ? "chip--activo" : ""}`}
              onClick={() => alternar(talle, setTalle, t)} aria-pressed={talle.includes(t)}>{t}</button>
          ))}
        </div>
        <p className="ayuda">Letras para remeras, vestidos, polleras, camperas y buzos. Números para pantalones.</p>

        <h3 className="etiqueta">Precio hasta <strong>{precio(tope)}</strong></h3>
        <input type="range" className="rango" min={filtros.precio_min} max={filtros.precio_max} step={5000}
          value={tope} onChange={(e) => setTope(Number(e.target.value))} />

        <div className="hoja__pie">
          <button className="boton boton--secundario" onClick={() => { setColor([]); setTalle([]); setTope(filtros.precio_max); setOrden("relevancia"); }}>
            Limpiar
          </button>
          <button className="boton" onClick={() => aplicar({ color, talle, precio_max: tope >= filtros.precio_max ? "" : tope, orden })}>
            Ver resultados
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Buscar() {
  const [params, setParams] = useSearchParams();
  const valores = useMemo(() => ({
    q: params.get("q") || "",
    categoria: params.get("categoria") || "",
    color: params.getAll("color"),
    talle: params.getAll("talle"),
    precio_max: params.get("precio_max") || "",
    orden: params.get("orden") || "relevancia",
  }), [params]);

  const [texto, setTexto] = useState(valores.q);
  const [abierta, setAbierta] = useState(false);
  const clave = params.toString();
  // La página vuelve a 1 cada vez que cambia la búsqueda o un filtro
  const [pag, setPag] = useState({ clave, n: 1 });
  const pagina = pag.clave === clave ? pag.n : 1;
  const [items, setItems] = useState([]);
  const filtros = useCarga(() => api.filtros(), []);

  const cambiar = (nuevos) => {
    const v = { ...valores, ...nuevos };
    const p = new URLSearchParams();
    Object.entries(v).forEach(([k, x]) => {
      if (Array.isArray(x)) x.forEach((y) => p.append(k, y));
      else if (x && !(k === "orden" && x === "relevancia")) p.set(k, x);
    });
    setParams(p, { replace: true });
  };

  // Buscar mientras escribe (espera 300 ms a que deje de tipear)
  useEffect(() => {
    const t = setTimeout(() => { if (texto !== valores.q) cambiar({ q: texto }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const res = useCarga(() => api.productos({ ...valores, pagina, por_pagina: POR_PAGINA }), [clave, pagina]);

  useEffect(() => {
    if (!res.datos) return;
    setItems((prev) => (pagina === 1 ? res.datos.items : [...prev, ...res.datos.items]));
  }, [res.datos, pagina]);

  const cantFiltros = valores.color.length + valores.talle.length + (valores.precio_max ? 1 : 0) + (valores.orden !== "relevancia" ? 1 : 0);
  const total = res.datos?.total ?? 0;

  return (
    <main className="pantalla">
      <TarjetaChica cual="buscar" color="lila">
        <h1 className="titulo-pantalla">Buscar</h1>
        <p>Remeras, vestidos, jeans… encontrá tu próximo look.</p>
      </TarjetaChica>
      <div className="buscador">
        <Icono nombre="buscar" tam={20} />
        <input type="search" placeholder="Remeras, jeans, rosa…" value={texto}
          onChange={(e) => setTexto(e.target.value)} aria-label="Buscar prendas" enterKeyHint="search" />
        {texto && <button className="buscador__borrar" onClick={() => setTexto("")} aria-label="Borrar"><Icono nombre="cerrar" tam={18} /></button>}
      </div>

      <div className="chips chips--scroll">
        <button className={`chip ${!valores.categoria ? "chip--activo" : ""}`} onClick={() => cambiar({ categoria: "" })}>Todo</button>
        {Object.entries(NOMBRE_CATEGORIA).map(([k, t]) => (
          <button key={k} className={`chip ${valores.categoria === k ? "chip--activo" : ""}`} onClick={() => cambiar({ categoria: k })}>{t}</button>
        ))}
      </div>

      <div className="resultados__barra">
        <span className="ayuda">{res.cargando && pagina === 1 ? "Buscando…" : `${total} prenda${total === 1 ? "" : "s"}`}</span>
        <button className="chip chip--filtro" onClick={() => setAbierta(true)} disabled={!filtros.datos}>
          <Icono nombre="filtro" tam={18} /> Filtros {cantFiltros > 0 && <span className="badge badge--en-linea">{cantFiltros}</span>}
        </button>
      </div>

      {res.error ? <ErrorCarga error={res.error} reintentar={res.reintentar} />
        : res.cargando && pagina === 1 ? <Cargando />
        : items.length === 0 ? (
          <Vacio icono="buscar" titulo="No encontramos nada" texto="Probá con otra palabra o sacá algún filtro." />
        ) : (
          <>
            <div className="grilla">{items.map((p) => <Tarjeta key={p.id} producto={p} />)}</div>
            {items.length < total && (
              <button className="boton boton--secundario boton--ancho" onClick={() => setPag({ clave, n: pagina + 1 })} disabled={res.cargando}>
                {res.cargando ? "Cargando…" : "Ver más"}
              </button>
            )}
          </>
        )}

      {abierta && filtros.datos && (
        <HojaFiltros filtros={filtros.datos} valores={valores} cerrar={() => setAbierta(false)}
          aplicar={(v) => { cambiar(v); setAbierta(false); }} />
      )}
    </main>
  );
}
