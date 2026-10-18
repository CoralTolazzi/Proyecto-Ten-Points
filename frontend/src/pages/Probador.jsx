import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, precio } from "../api";
import { Encabezado, FotoPrenda, Vacio } from "../components/Comunes";
import Icono from "../components/Icono";
import { useTienda } from "../tienda";
import { useCarga } from "../useCarga";

// Texto de los términos del probador. Si conectan un modelo o servicio externo que
// guarde las fotos o las use para entrenar, hay que actualizar este texto.
function Terminos({ cerrar, aceptar }) {
  return (
    <div className="hoja-fondo" onClick={cerrar}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label="Términos y condiciones del probador" onClick={(e) => e.stopPropagation()}>
        <div className="hoja__cabeza">
          <h2>Términos del probador</h2>
          <button className="boton-icono" onClick={cerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
        </div>
        <div className="terminos">
          <h3>1. Para qué usamos tu foto</h3>
          <p>Solo para generar la imagen de cómo te queda la prenda que elegiste. No la usamos para nada más.</p>
          <h3>2. Qué no hacemos con tu foto</h3>
          <ul>
            <li>No la guardamos: se procesa en el momento y se descarta.</li>
            <li>No la publicamos ni la compartimos con otras personas o empresas.</li>
            <li>No la usamos para entrenar modelos de inteligencia artificial.</li>
          </ul>
          <h3>3. Qué foto subir</h3>
          <ul>
            <li>Una foto tuya, de cuerpo entero, con ropa puesta.</li>
            <li>No subas fotos de otras personas sin su permiso.</li>
            <li>Si sos menor de 18 años, pedile permiso a un adulto responsable antes de usar el probador.</li>
          </ul>
          <h3>4. El resultado</h3>
          <p>La imagen la genera una IA: es una aproximación y puede no ser exacta en talle, color o calce. Para elegir el talle usá la guía de talles de cada prenda.</p>
          <h3>5. Proyecto académico</h3>
          <p>Ten Points es un proyecto de estudio, no una tienda real.</p>
        </div>
        <div className="hoja__pie hoja__pie--uno">
          <button className="boton" onClick={aceptar}>Acepto los términos</button>
        </div>
      </div>
    </div>
  );
}

export default function Probador() {
  const { perchero, descolgar, avisar } = useTienda();
  const estado = useCarga(() => api.estadoProbador(), []);
  const [elegida, setElegida] = useState(null);
  const [foto, setFoto] = useState(null); // { archivo, url }
  const [resultado, setResultado] = useState(null);
  const [probando, setProbando] = useState(false);
  const [acepta, setAcepta] = useState(false);
  const [verTerminos, setVerTerminos] = useState(false);
  const input = useRef(null);

  // Si se descuelga la prenda elegida, elegir otra
  useEffect(() => {
    if (!perchero.some((x) => x.id === elegida)) setElegida(perchero[0]?.id ?? null);
  }, [perchero, elegida]);

  // Liberar memoria de las fotos que ya no se muestran
  useEffect(() => () => foto && URL.revokeObjectURL(foto.url), [foto]);
  useEffect(() => () => resultado && URL.revokeObjectURL(resultado), [resultado]);

  const prenda = perchero.find((x) => x.id === elegida);
  const disponible = estado.datos?.disponible;

  const elegirFoto = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) { avisar("Tiene que ser una foto", "error"); return; }
    setFoto({ archivo, url: URL.createObjectURL(archivo) });
    setResultado(null);
  };

  const probar = async () => {
    setProbando(true);
    try {
      const blob = await api.probar(foto.archivo, prenda.id, acepta);
      setResultado(URL.createObjectURL(blob));
    } catch (e) {
      avisar(e.message, "error");
    }
    setProbando(false);
  };

  return (
    <main className="pantalla">
      <Encabezado titulo="Probador" volver={false} />

      {estado.datos && !disponible && (
        <div className="cartel-ia">
          <Icono nombre="chispas" />
          <span><strong>Probador con IA: muy pronto.</strong> Ya podés armar tu perchero; cuando la IA esté lista, te lo probás con una foto.</span>
        </div>
      )}

      <section className="seccion">
        <div className="seccion__cabeza">
          <h2 className="seccion__titulo">Mi perchero</h2>
          <span className="ayuda">{perchero.length}/12</span>
        </div>

        {perchero.length === 0 ? (
          <Vacio icono="perchero" titulo="Tu perchero está vacío"
            texto="En cada prenda tocá el botón del perchero para colgarla acá."
            accion={<Link to="/buscar" className="boton">Buscar prendas</Link>} />
        ) : (
          <div className="perchero">
            <div className="perchero__barra" />
            <div className="perchero__prendas">
              {perchero.map((x) => (
                <div key={x.id} className={`colgada ${x.id === elegida ? "colgada--elegida" : ""}`}>
                  <svg className="colgada__gancho" viewBox="0 0 40 30" aria-hidden="true">
                    <path d="M20 10a4 4 0 1 0-4-4M20 10v3L4 26h32L20 13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <button className="colgada__foto" onClick={() => setElegida(x.id)} aria-pressed={x.id === elegida}
                    aria-label={`Elegir ${x.nombre} ${x.color.nombre}`}>
                    <FotoPrenda src={x.color.imagen_url} alt="" hex={x.color.hex} />
                  </button>
                  <span className="colgada__nombre">{x.nombre}</span>
                  <span className="colgada__precio">{precio(x.precio)}</span>
                  <div className="colgada__acciones">
                    <Link to={`/producto/${x.producto_id}`} className="mini-boton" aria-label="Ver la prenda para comprarla"><Icono nombre="bolsa" tam={16} /></Link>
                    <button className="mini-boton" onClick={() => descolgar(x.id)} aria-label="Sacar del perchero"><Icono nombre="basura" tam={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {perchero.length > 0 && (
        <section className="seccion">
          <h2 className="seccion__titulo">Probátelo</h2>
          <div className="probar">
            <button className="probar__caja" onClick={() => input.current?.click()}>
              {foto ? <img src={foto.url} alt="Tu foto" /> : (
                <span className="probar__vacio"><Icono nombre="camara" tam={32} /> Subí una foto tuya de cuerpo entero</span>
              )}
            </button>
            <div className="probar__caja probar__caja--resultado">
              {probando ? (
                <div className="probar__cargando">
                  <div className="cargando">
                    <span className="cargando__punto" />
                    <span className="cargando__punto" />
                    <span className="cargando__punto" />
                  </div>
                  <p>Probándote la prenda con IA...</p>
                  <span>Demora entre 15 y 20 segundos</span>
                </div>
              ) : resultado ? (
                <img src={resultado} alt={`Vos con ${prenda?.nombre}`} />
              ) : prenda ? (
                <>
                  <FotoPrenda src={prenda.color.imagen_url} alt={prenda.nombre} hex={prenda.color.hex} />
                  <span className="probar__tag">{prenda.color.nombre}</span>
                </>
              ) : null}
            </div>
          </div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" capture="user" hidden onChange={elegirFoto} />
          <div className="advertencia" role="note">
            <Icono nombre="camara" />
            <span>
              <strong>Tu foto es tuya.</strong> Solo la usamos para mostrarte cómo te queda la prenda:
              no la guardamos, no la compartimos y no la usamos para entrenar IA.
            </span>
          </div>
          <label className={`acepto ${acepta ? "acepto--si" : ""}`}>
            <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
            <span className="acepto__caja" aria-hidden="true">{acepta && <Icono nombre="check" tam={16} grosor={3} />}</span>
            <span>
              Leí y acepto los{" "}
              <button type="button" className="link-chico link-chico--en-linea" onClick={() => setVerTerminos(true)}>
                términos y condiciones
              </button>{" "}
              del probador.
            </span>
          </label>
          <button className="boton boton--grande boton--ancho boton--ia" onClick={probar}
            disabled={!disponible || !acepta || !foto || !prenda || probando}>
            <Icono nombre="chispas" tam={20} />
            {!disponible ? "Probar con IA (próximamente)" : probando ? "Probando…" : !foto ? "Subí tu foto para probar"
              : !acepta ? "Aceptá los términos para probar" : "Probar con IA"}
          </button>
        </section>
      )}
      {verTerminos && (
        <Terminos cerrar={() => setVerTerminos(false)} aceptar={() => { setAcepta(true); setVerTerminos(false); }} />
      )}
    </main>
  );
}
