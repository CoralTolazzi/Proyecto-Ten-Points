import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api, precio } from "../api";
import { Cargando, Encabezado, ErrorCarga, FotoPrenda } from "../components/Comunes";
import Icono from "../components/Icono";
import { useTienda } from "../tienda";
import { useCarga } from "../useCarga";

const COSTO_ENVIO = 6999; // mismo valor que el backend (el total final lo calcula el backend)

// ---------- ayudas para la tarjeta (el backend vuelve a validar todo) ----------
const soloNumeros = (s) => s.replace(/\D/g, "");

function marcaDe(numero) {
  if (/^4/.test(numero)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(numero)) return "Mastercard";
  if (/^3[47]/.test(numero)) return "American Express";
  return null;
}

function luhnOk(numero) {
  let total = 0;
  [...numero].reverse().forEach((d, i) => {
    let n = Number(d);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    total += n;
  });
  return total % 10 === 0;
}

// "4111111111111111" -> "4111 1111 1111 1111" (Amex: 4-6-5)
function formatearNumero(numero) {
  const grupos = marcaDe(numero) === "American Express" ? [4, 6, 5] : [4, 4, 4, 4, 3];
  const partes = [];
  let i = 0;
  for (const g of grupos) {
    if (i >= numero.length) break;
    partes.push(numero.slice(i, i + g));
    i += g;
  }
  return partes.join(" ");
}

function formatearVencimiento(valor, anterior) {
  const d = soloNumeros(valor).slice(0, 4);
  if (d.length <= 2) return d.length === 2 && valor.length > anterior.length ? d + "/" : d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function vencida(mmaa) {
  const [mes, anio] = mmaa.split("/").map(Number);
  const hoy = new Date();
  return 2000 + anio < hoy.getFullYear() || (2000 + anio === hoy.getFullYear() && mes < hoy.getMonth() + 1);
}

// ---------- piezas ----------
function Campo({ label, error, ...props }) {
  return (
    <label className="campo">
      <span className="campo__label">{label}</span>
      <input className={`campo__input ${error ? "campo__input--error" : ""}`} aria-invalid={!!error} {...props} />
      {error && <span className="error-texto">{error}</span>}
    </label>
  );
}

function TarjetaDibujo({ numero, titular, vencimiento, girada }) {
  const marca = marcaDe(numero);
  return (
    <div className={`tarjeta-dibujo ${girada ? "tarjeta-dibujo--girada" : ""}`} aria-hidden="true">
      <div className="tarjeta-dibujo__cara tarjeta-dibujo__frente">
        <div className="tarjeta-dibujo__arriba">
          <span className="tarjeta-dibujo__chip" />
          <span className="tarjeta-dibujo__marca">{marca || "Tarjeta"}</span>
        </div>
        <span className="tarjeta-dibujo__numero">{formatearNumero(numero.padEnd(16, "•")).slice(0, 23)}</span>
        <div className="tarjeta-dibujo__abajo">
          <span><small>Titular</small>{titular.toUpperCase() || "NOMBRE APELLIDO"}</span>
          <span><small>Vence</small>{vencimiento || "MM/AA"}</span>
        </div>
      </div>
      <div className="tarjeta-dibujo__cara tarjeta-dibujo__dorso">
        <span className="tarjeta-dibujo__banda" />
        <span className="tarjeta-dibujo__cvv">CVV</span>
      </div>
    </div>
  );
}

// ---------- pantalla ----------
export default function Compra() {
  const { carrito, recargarCarrito } = useTienda();
  const navegar = useNavigate();
  const [envio, setEnvio] = useState("domicilio");
  const [datos, setDatos] = useState({ nombre: "", apellido: "", email: "", direccion: "", ciudad: "", codigo_postal: "" });
  const [tarjeta, setTarjeta] = useState({ numero: "", titular: "", vencimiento: "", cvv: "" });
  const [girada, setGirada] = useState(false);
  const [errores, setErrores] = useState({});
  const [rechazo, setRechazo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (!carrito) return <main className="pantalla"><Encabezado titulo="Finalizar compra" /><Cargando /></main>;
  if (carrito.items.length === 0) return <Navigate to="/carrito" replace />;

  const costoEnvio = envio === "retiro" || carrito.falta_para_envio_gratis === 0 ? 0 : COSTO_ENVIO;
  const total = carrito.subtotal + costoEnvio;
  const marca = marcaDe(tarjeta.numero);
  const largoCvv = marca === "American Express" ? 4 : 3;
  const largoNumero = marca === "American Express" ? 15 : 16;

  const limpiarError = (k) => { setErrores((e) => ({ ...e, [k]: null })); setRechazo(null); };
  const set = (k) => (e) => { setDatos({ ...datos, [k]: e.target.value }); limpiarError(k); };
  const setT = (k, v) => { setTarjeta((t) => ({ ...t, [k]: v })); limpiarError(k); };

  const validar = () => {
    const e = {};
    if (datos.nombre.trim().length < 2) e.nombre = "Escribí tu nombre";
    if (datos.apellido.trim().length < 2) e.apellido = "Escribí tu apellido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) e.email = "Revisá el mail (ej. nombre@gmail.com)";
    if (envio === "domicilio") {
      if (!datos.direccion.trim()) e.direccion = "Falta la dirección";
      if (!datos.ciudad.trim()) e.ciudad = "Falta la ciudad";
      if (!datos.codigo_postal.trim()) e.codigo_postal = "Falta el CP";
    }
    if (!marca || tarjeta.numero.length < largoNumero || !luhnOk(tarjeta.numero)) e.numero = "El número de tarjeta no es válido";
    if (tarjeta.titular.trim().length < 3) e.titular = "Como figura en la tarjeta";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(tarjeta.vencimiento)) e.vencimiento = "Formato MM/AA";
    else if (vencida(tarjeta.vencimiento)) e.vencimiento = "La tarjeta está vencida";
    if (tarjeta.cvv.length !== largoCvv) e.cvv = `${largoCvv} números`;
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const pagar = async (ev) => {
    ev.preventDefault();
    setRechazo(null);
    if (!validar()) {
      setRechazo("Revisá los datos marcados en rojo");
      return;
    }
    setEnviando(true);
    try {
      const cliente = { ...datos };
      if (envio === "retiro") { cliente.direccion = null; cliente.ciudad = null; cliente.codigo_postal = null; }
      const pedido = await api.comprar({ cliente, envio, tarjeta });
      // Primero ir a la confirmación y después actualizar el carrito (que ahora está vacío);
      // al revés, esta pantalla vería el carrito vacío y mandaría al carrito.
      navegar(`/compra/listo/${pedido.id}`, { replace: true });
      recargarCarrito();
    } catch (e) {
      setRechazo(e.message);
      if (e.campo) setErrores((x) => ({ ...x, [e.campo]: e.message }));
      setEnviando(false);
    }
  };

  return (
    <main className="pantalla pantalla--con-accion">
      <Encabezado titulo="Finalizar compra" />

      <form onSubmit={pagar} noValidate>
        <section className="bloque">
          <h2 className="bloque__titulo"><span className="numero">1</span> Tus datos</h2>
          <div className="fila-2 fila-2--iguales">
            <Campo label="Nombre" value={datos.nombre} onChange={set("nombre")} error={errores.nombre} autoComplete="given-name" />
            <Campo label="Apellido" value={datos.apellido} onChange={set("apellido")} error={errores.apellido} autoComplete="family-name" />
          </div>
          <Campo label="Mail" type="email" value={datos.email} onChange={set("email")} error={errores.email}
            autoComplete="email" inputMode="email" placeholder="nombre@gmail.com" />
          <p className="ayuda">Te mandamos el comprobante a este mail.</p>
        </section>

        <section className="bloque">
          <h2 className="bloque__titulo"><span className="numero">2</span> Entrega</h2>
          <div className="opciones">
            <label className={`opcion ${envio === "domicilio" ? "opcion--activa" : ""}`}>
              <input type="radio" name="envio" checked={envio === "domicilio"} onChange={() => setEnvio("domicilio")} />
              <Icono nombre="camion" />
              <span className="opcion__texto">Envío a domicilio<small>{carrito.falta_para_envio_gratis === 0 ? "Gratis" : precio(COSTO_ENVIO)} · 3 a 5 días</small></span>
            </label>
            <label className={`opcion ${envio === "retiro" ? "opcion--activa" : ""}`}>
              <input type="radio" name="envio" checked={envio === "retiro"} onChange={() => setEnvio("retiro")} />
              <Icono nombre="tienda" />
              <span className="opcion__texto">Retiro en el local<small>Gratis · en 48 h</small></span>
            </label>
          </div>
          {envio === "domicilio" && (
            <>
              <Campo label="Dirección" value={datos.direccion} onChange={set("direccion")} error={errores.direccion} autoComplete="street-address" />
              <div className="fila-2">
                <Campo label="Ciudad" value={datos.ciudad} onChange={set("ciudad")} error={errores.ciudad} autoComplete="address-level2" />
                <Campo label="CP" value={datos.codigo_postal} onChange={set("codigo_postal")} error={errores.codigo_postal} autoComplete="postal-code" inputMode="numeric" />
              </div>
            </>
          )}
        </section>

        <section className="bloque">
          <h2 className="bloque__titulo"><span className="numero">3</span> Pago con tarjeta</h2>
          <TarjetaDibujo {...tarjeta} girada={girada} />
          <Campo label="Número de tarjeta" value={formatearNumero(tarjeta.numero)} error={errores.numero}
            onChange={(e) => setT("numero", soloNumeros(e.target.value).slice(0, 16))}
            inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" />
          <Campo label="Nombre como figura en la tarjeta" value={tarjeta.titular} error={errores.titular}
            onChange={(e) => setT("titular", e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü' ]/g, "").slice(0, 60))}
            autoComplete="cc-name" placeholder="CORAL TOLAZZI" />
          <div className="fila-2 fila-2--iguales">
            <Campo label="Vencimiento" value={tarjeta.vencimiento} error={errores.vencimiento}
              onChange={(e) => setT("vencimiento", formatearVencimiento(e.target.value, tarjeta.vencimiento))}
              inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" />
            <Campo label="Código de seguridad" value={tarjeta.cvv} error={errores.cvv}
              onChange={(e) => setT("cvv", soloNumeros(e.target.value).slice(0, 4))}
              onFocus={() => setGirada(true)} onBlur={() => setGirada(false)}
              inputMode="numeric" autoComplete="cc-csc" placeholder={largoCvv === 4 ? "1234" : "123"} type="password" />
          </div>
          <p className="ayuda">Aceptamos Visa, Mastercard y American Express. Un solo pago.</p>
        </section>

        <section className="bloque">
          <h2 className="bloque__titulo">Tu pedido</h2>
          <ul className="mini-items">
            {carrito.items.map((i) => (
              <li key={i.id}>
                <span className="mini-items__foto"><FotoPrenda src={i.color.imagen_url} alt="" hex={i.color.hex} /></span>
                <span className="mini-items__texto">{i.cantidad} × {i.nombre}<small>{i.color.nombre} · {i.talle}</small></span>
                <span>{precio(i.subtotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="resumen resumen--plano">
            <div><dt>Subtotal</dt><dd>{precio(carrito.subtotal)}</dd></div>
            <div><dt>Envío</dt><dd>{costoEnvio ? precio(costoEnvio) : "Gratis"}</dd></div>
            <div className="resumen__total"><dt>Total</dt><dd>{precio(total)}</dd></div>
          </dl>
        </section>

        <div className="accion-fija accion-fija--columna">
          {/* El aviso va pegado al botón para que se vea siempre, aunque estés abajo de todo */}
          {rechazo && (
            <div className="advertencia advertencia--fuerte" role="alert">
              <Icono nombre="cerrar" />
              <span><strong>No se pudo pagar.</strong> {rechazo}</span>
            </div>
          )}
          <button type="submit" className="boton boton--grande boton--ancho" disabled={enviando}>
            <Icono nombre="tarjeta" tam={20} /> {enviando ? "Procesando pago…" : `Pagar ${precio(total)}`}
          </button>
        </div>
      </form>
    </main>
  );
}

export function CompraLista() {
  const { id } = useParams();
  const { datos: p, error, reintentar } = useCarga(() => api.pedido(id), [id]);
  if (error) return <main className="pantalla"><ErrorCarga error={error} reintentar={reintentar} /></main>;
  if (!p) return <main className="pantalla"><Cargando /></main>;
  const cantidad = p.items.reduce((n, i) => n + i.cantidad, 0);
  return (
    <main className="pantalla listo">
      <div className="listo__sello"><Icono nombre="check" tam={56} grosor={3} /></div>
      <h1 className="listo__titulo">¡Pago aprobado, {p.cliente.nombre}!</h1>
      <p>Tu pedido <strong>{p.numero}</strong> está confirmado.</p>
      <p className="ayuda">
        {p.envio === "retiro" ? "Te avisamos cuando esté listo para retirar." : `Lo enviamos a ${p.cliente.direccion}, ${p.cliente.ciudad}.`}
        {" "}Te mandamos el comprobante a {p.cliente.email}.
      </p>
      <dl className="resumen">
        <div><dt>A nombre de</dt><dd>{`${p.cliente.nombre} ${p.cliente.apellido}`.trim()}</dd></div>
        <div><dt>Pagado con</dt><dd>{p.pago}</dd></div>
        <div><dt>{cantidad} prenda{cantidad === 1 ? "" : "s"}</dt><dd>{precio(p.subtotal)}</dd></div>
        <div><dt>Envío</dt><dd>{p.costo_envio ? precio(p.costo_envio) : "Gratis"}</dd></div>
        <div className="resumen__total"><dt>Total</dt><dd>{precio(p.total)}</dd></div>
      </dl>
      <Link to="/" className="boton boton--grande boton--ancho">Seguir mirando</Link>
    </main>
  );
}
