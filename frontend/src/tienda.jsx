// Estado compartido por toda la app: carrito, perchero y avisos (toasts).
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";

const Tienda = createContext(null);

export function TiendaProvider({ children }) {
  const [carrito, setCarrito] = useState(null);
  const [errorCarrito, setErrorCarrito] = useState(null);
  const [perchero, setPerchero] = useState([]);
  const [aviso, setAviso] = useState(null);

  const avisar = useCallback((texto, tipo = "ok") => {
    setAviso({ texto, tipo, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  const cargarCarrito = useCallback(async () => {
    try {
      setCarrito(await api.carrito());
      setErrorCarrito(null);
      return true;
    } catch (e) {
      setErrorCarrito(e);
      return false;
    }
  }, []);

  useEffect(() => {
    cargarCarrito();
    api.perchero().then(setPerchero).catch(() => {});
  }, [cargarCarrito]);

  // Cada acción devuelve true/false para que la pantalla sepa si salió bien
  const correr = useCallback(async (promesa, guardar, textoOk) => {
    try {
      guardar(await promesa);
      if (textoOk) avisar(textoOk);
      return true;
    } catch (e) {
      avisar(e.message, "error");
      return false;
    }
  }, [avisar]);

  const valor = {
    carrito, errorCarrito, perchero, aviso, avisar,
    agregarAlCarrito: (item) => correr(api.agregarAlCarrito(item), setCarrito, "¡Agregado al carrito!"),
    cambiarCantidad: (id, n) => correr(api.cambiarCantidad(id, n), setCarrito),
    quitarDelCarrito: (id) => correr(api.quitarDelCarrito(id), setCarrito, "Lo sacaste del carrito"),
    recargarCarrito: cargarCarrito,
    recargarPerchero: () => correr(api.perchero(), setPerchero),
    colgar: (item) => correr(api.colgar(item), setPerchero, "¡Colgado en tu perchero!"),
    descolgar: (id) => correr(api.descolgar(id), setPerchero, "Lo sacaste del perchero"),
  };

  return <Tienda.Provider value={valor}>{children}</Tienda.Provider>;
}

export const useTienda = () => useContext(Tienda);
