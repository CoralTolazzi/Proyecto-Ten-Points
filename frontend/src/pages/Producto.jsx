import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, NOMBRE_CATEGORIA, precio } from "../api";
import { Cargando, Encabezado, ErrorCarga, FotoPrenda, Tarjeta } from "../components/Comunes";
import Icono from "../components/Icono";
import { useTienda } from "../tienda";
import { useCarga } from "../useCarga";

const rango = (r) => (r ? `${r.min}–${r.max}` : "—");

function GuiaTalles({ producto, cerrar }) {
  const esPantalon = producto.sistema_talles === "numerico_34_44";
  const conBusto = producto.talles.some((t) => t.busto_cm);
  return (
    <div className="hoja-fondo" onClick={cerrar}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label="Guía de talles" onClick={(e) => e.stopPropagation()}>
        <div className="hoja__cabeza">
          <h2>Guía de talles</h2>
          <button className="boton-icono" onClick={cerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
        </div>
        <p className="ayuda">Medidas del cuerpo en centímetros. Medite con un centímetro de costura, sin apretar.</p>
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                <th>Talle</th>
                {conBusto && <th>Busto</th>}
                <th>Cintura</th>
                <th>Cadera</th>
                {esPantalon && <th>Entrepierna</th>}
              </tr>
            </thead>
            <tbody>
              {producto.talles.map((t) => (
                <tr key={t.id}>
                  <th>{t.talle}</th>
                  {conBusto && <td>{rango(t.busto_cm)}</td>}
                  <td>{rango(t.cintura_cm)}</td>
                  <td>{rango(t.cadera_cm)}</td>
                  {esPantalon && <td>{t.largo_entrepierna_cm}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ayuda">¿Estás entre dos talles? Elegí el más grande.</p>
      </div>
    </div>
  );
}

export default function Producto() {
  const { id } = useParams();
  const { datos: p, error, reintentar } = useCarga(() => api.producto(id), [id]);
  const rel = useCarga(() => api.relacionados(id), [id]);
  const { agregarAlCarrito, colgar, perchero } = useTienda();
  const [colorId, setColorId] = useState(null);
  const [talleId, setTalleId] = useState(null);
  const [guia, setGuia] = useState(false);
  const [falta, setFalta] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (p) { setColorId(p.colores[0].id); setTalleId(null); setFalta(false); window.scrollTo(0, 0); }
  }, [p]);

  if (error) return <main className="pantalla"><Encabezado titulo="" /><ErrorCarga error={error} reintentar={reintentar} /></main>;
  if (!p) return <main className="pantalla"><Encabezado titulo="" /><Cargando /></main>;

  const color = p.colores.find((c) => c.id === colorId) || p.colores[0];
  const enPerchero = perchero.some((x) => x.color.id === color.id);

  const alCarrito = async () => {
    if (!talleId) { setFalta(true); return; }
    setOcupado(true);
    await agregarAlCarrito({ producto_id: p.id, color_id: color.id, talle_id: talleId, cantidad: 1 });
    setOcupado(false);
  };

  return (
    <main className="pantalla pantalla--con-accion">
      <Encabezado titulo={NOMBRE_CATEGORIA[p.categoria]} />

      <div className="producto__foto" style={{ "--color-prenda": color.hex }}>
        <FotoPrenda key={color.id} src={color.imagen_url} alt={`${p.nombre} en ${color.nombre}`} hex={color.hex} />
        {enPerchero && <span className="sticker sticker--foto"><Icono nombre="perchero" tam={16} /> En tu perchero</span>}
      </div>

      {p.colores.length > 1 && (
        <div className="miniaturas" role="radiogroup" aria-label="Fotos por color">
          {p.colores.map((c) => (
            <button key={c.id} role="radio" aria-checked={c.id === color.id} aria-label={c.nombre}
              className={`miniatura ${c.id === color.id ? "miniatura--activa" : ""}`} onClick={() => setColorId(c.id)}>
              <FotoPrenda src={c.imagen_url} alt="" hex={c.hex} />
            </button>
          ))}
        </div>
      )}

      <section className="producto__info">
        <h1 className="producto__nombre">{p.nombre}</h1>
        <p className="producto__precio">{precio(p.precio)}</p>
        <p className="producto__desc">{p.descripcion}</p>

        <h2 className="etiqueta">Color: <strong>{color.nombre}</strong></h2>
        <div className="colores" role="radiogroup" aria-label="Color">
          {p.colores.map((c) => (
            <button key={c.id} role="radio" aria-checked={c.id === color.id} title={c.nombre} aria-label={c.nombre}
              className={`color ${c.id === color.id ? "color--activo" : ""}`} onClick={() => setColorId(c.id)}>
              <span style={{ background: c.hex }} />
            </button>
          ))}
        </div>

        <div className="fila-entre">
          <h2 className="etiqueta">Talle</h2>
          <button className="link-chico" onClick={() => setGuia(true)}><Icono nombre="regla" tam={18} /> Guía de talles</button>
        </div>
        <div className="chips" role="radiogroup" aria-label="Talle">
          {p.talles.map((t) => (
            <button key={t.id} role="radio" aria-checked={t.id === talleId}
              className={`chip chip--talle ${t.id === talleId ? "chip--activo" : ""}`}
              onClick={() => { setTalleId(t.id); setFalta(false); }}>{t.talle}</button>
          ))}
        </div>
        {falta && <p className="error-texto">Elegí un talle para agregarlo al carrito</p>}
      </section>

      {rel.datos?.length > 0 && (
        <section className="seccion">
          <h2 className="seccion__titulo">También te puede gustar</h2>
          <div className="carrusel">{rel.datos.map((r) => <Tarjeta key={r.id} producto={r} />)}</div>
        </section>
      )}

      <div className="accion-fija">
        {enPerchero ? (
          <Link to="/probador" className="boton-perchero boton-perchero--lleno" aria-label="Ya está en tu perchero: ir al probador">
            <Icono nombre="perchero" />
          </Link>
        ) : (
          <button className="boton-perchero" onClick={() => colgar({ producto_id: p.id, color_id: color.id })}
            aria-label="Colgar en el perchero" title="Colgar en el perchero">
            <Icono nombre="perchero" />
          </button>
        )}
        <button className="boton boton--grande" onClick={alCarrito} disabled={ocupado}>
          <Icono nombre="bolsa" tam={20} /> {ocupado ? "Agregando…" : "Agregar al carrito"}
        </button>
      </div>

      {guia && <GuiaTalles producto={p} cerrar={() => setGuia(false)} />}
    </main>
  );
}
