import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { precio } from "../api";
import { Cargando, Encabezado, ErrorCarga, FotoPrenda, Vacio } from "../components/Comunes";
import Chica, { TarjetaChica } from "../components/Chica";
import Icono from "../components/Icono";
import { useTienda } from "../tienda";

export default function Carrito() {
  const { carrito, errorCarrito, recargarCarrito, cambiarCantidad, quitarDelCarrito, perchero } = useTienda();
  const navegar = useNavigate();

  // Cada vez que se entra al carrito se pide de nuevo al backend
  useEffect(() => {
    recargarCarrito();
  }, [recargarCarrito]);

  if (!carrito && errorCarrito) {
    return (
      <main className="pantalla">
        <Encabezado titulo="Mi carrito" volver={false} />
        <ErrorCarga error={errorCarrito} reintentar={recargarCarrito} />
      </main>
    );
  }
  if (!carrito) return <main className="pantalla"><Encabezado titulo="Mi carrito" volver={false} /><Cargando /></main>;

  if (carrito.items.length === 0) {
    return (
      <main className="pantalla">
        <Encabezado titulo="Mi carrito" volver={false} />
        <Chica cual="carrito" className="chica--vacio" />
        <Vacio icono={null} titulo="Tu carrito está vacío" texto="Cuando algo te guste, agregalo acá."
          accion={<Link to="/" className="boton">Ver prendas</Link>} />
        {perchero.length > 0 && (
          <Link to="/probador" className="aviso-perchero">
            <Icono nombre="perchero" /> Tenés {perchero.length} prenda{perchero.length > 1 ? "s" : ""} en el perchero
            <Icono nombre="adelante" tam={18} />
          </Link>
        )}
      </main>
    );
  }

  const progreso = Math.min(100, Math.round((carrito.subtotal / (carrito.subtotal + carrito.falta_para_envio_gratis)) * 100));

  return (
    <main className="pantalla pantalla--con-accion-y-tabs">
      <Encabezado titulo="Mi carrito" volver={false}
        derecha={<Link to="/probador" className="boton-icono" aria-label="Ir al perchero"><Icono nombre="perchero" /></Link>} />

      <TarjetaChica cual="carrito" color="rosa">
        <div className="envio-gratis envio-gratis--en-tarjeta">
          <Icono nombre="camion" />
          {carrito.falta_para_envio_gratis > 0
            ? <span>Te faltan <strong>{precio(carrito.falta_para_envio_gratis)}</strong> para el envío gratis</span>
            : <strong>¡Tenés envío gratis!</strong>}
        </div>
        <div className="barra"><span style={{ width: `${progreso}%` }} /></div>
      </TarjetaChica>

      <ul className="items">
        {carrito.items.map((i) => (
          <li key={i.id} className="item">
            <Link to={`/producto/${i.producto_id}`} className="item__foto">
              <FotoPrenda src={i.color.imagen_url} alt={i.nombre} hex={i.color.hex} />
            </Link>
            <div className="item__info">
              <Link to={`/producto/${i.producto_id}`} className="item__nombre">{i.nombre}</Link>
              <span className="item__detalle">
                <span className="punto" style={{ background: i.color.hex }} /> {i.color.nombre} · Talle {i.talle}
              </span>
              <div className="item__abajo">
                <span className="item__precio">{precio(i.subtotal)}</span>
                <div className="contador">
                  {i.cantidad > 1 ? (
                    <button onClick={() => cambiarCantidad(i.id, i.cantidad - 1)} aria-label="Uno menos"><Icono nombre="menos" tam={16} /></button>
                  ) : (
                    <button onClick={() => quitarDelCarrito(i.id)} aria-label="Sacar del carrito"><Icono nombre="basura" tam={16} /></button>
                  )}
                  <span aria-live="polite">{i.cantidad}</span>
                  <button onClick={() => cambiarCantidad(i.id, i.cantidad + 1)} disabled={i.cantidad >= 10} aria-label="Uno más"><Icono nombre="mas" tam={16} /></button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <dl className="resumen">
        <div><dt>Subtotal ({carrito.cantidad_total} prenda{carrito.cantidad_total > 1 ? "s" : ""})</dt><dd>{precio(carrito.subtotal)}</dd></div>
        <div><dt>Envío a domicilio</dt><dd>{carrito.costo_envio ? precio(carrito.costo_envio) : "Gratis"}</dd></div>
        <div className="resumen__total"><dt>Total</dt><dd>{precio(carrito.total)}</dd></div>
      </dl>

      <div className="accion-fija accion-fija--sobre-tabs">
        <button className="boton boton--grande boton--ancho" onClick={() => navegar("/compra")}>
          Comprar · {precio(carrito.total)}
        </button>
      </div>
    </main>
  );
}
