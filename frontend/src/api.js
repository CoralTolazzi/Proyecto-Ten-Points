// Todo lo que habla con el backend de Python está acá.
// En desarrollo, Vite manda /api al backend (ver vite.config.js).
// Si el backend está en otro lado, definir VITE_API_URL (ej. https://mi-api.com).
const BASE = (import.meta.env.VITE_API_URL || "") + "/api";

// Id de sesión: identifica el carrito y el perchero de esta persona (todavía no hay login).
function idSesion() {
  const nuevo = () =>
    (crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);
  try {
    let id = localStorage.getItem("tp-sesion");
    if (!id) {
      id = nuevo();
      localStorage.setItem("tp-sesion", id);
    }
    return id;
  } catch {
    // Navegador sin localStorage (modo privado): sesión solo mientras la pestaña esté abierta
    window.__tpSesion ||= nuevo();
    return window.__tpSesion;
  }
}

export class ErrorApi extends Error {
  constructor(status, mensaje, campo = null) {
    super(mensaje);
    this.status = status;
    this.campo = campo; // en pagos rechazados: qué dato está mal (numero, vencimiento, cvv, titular)
  }
}

async function pedir(ruta, { method = "GET", body, form } = {}) {
  const headers = { "X-Sesion": idSesion() };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res;
  try {
    res = await fetch(BASE + ruta, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ErrorApi(0, "No hay conexión con el servidor. ¿Está prendido el backend?");
  }
  if (!res.ok) {
    let mensaje = "Algo salió mal";
    let campo = null;
    try {
      const { detail } = await res.json();
      if (typeof detail === "string") mensaje = detail;
      else if (detail?.mensaje) ({ mensaje, campo } = detail);
      else mensaje = "Revisá los datos que cargaste";
    } catch {
      // Sin JSON y error 5xx: casi siempre es que Vite no pudo llegar al backend
      if (res.status >= 500) mensaje = "El servidor no responde. ¿Está prendido el backend (uvicorn)?";
    }
    throw new ErrorApi(res.status, mensaje, campo);
  }
  const tipo = res.headers.get("Content-Type") || "";
  return tipo.startsWith("image/") ? res.blob() : res.json();
}

const qs = (params) => {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((x) => u.append(k, x));
    else if (v !== undefined && v !== null && v !== "") u.append(k, v);
  });
  const s = u.toString();
  return s ? `?${s}` : "";
};

export const api = {
  categorias: () => pedir("/categorias"),
  filtros: () => pedir("/filtros"),
  productos: (params = {}) => pedir("/productos" + qs(params)),
  producto: (id) => pedir(`/productos/${id}`),
  relacionados: (id) => pedir(`/productos/${id}/relacionados`),

  carrito: () => pedir("/carrito"),
  agregarAlCarrito: (item) => pedir("/carrito/items", { method: "POST", body: item }),
  cambiarCantidad: (itemId, cantidad) => pedir(`/carrito/items/${itemId}`, { method: "PATCH", body: { cantidad } }),
  quitarDelCarrito: (itemId) => pedir(`/carrito/items/${itemId}`, { method: "DELETE" }),

  perchero: () => pedir("/perchero"),
  colgar: (item) => pedir("/perchero", { method: "POST", body: item }),
  descolgar: (itemId) => pedir(`/perchero/${itemId}`, { method: "DELETE" }),

  comprar: (pedido) => pedir("/pedidos", { method: "POST", body: pedido }),
  pedido: (id) => pedir(`/pedidos/${id}`),

  estadoProbador: () => pedir("/probador/estado"),
  probar: (foto, itemPercheroId, aceptaTerminos) => {
    const form = new FormData();
    form.append("foto", foto);
    form.append("item_perchero_id", itemPercheroId);
    form.append("acepta_terminos", aceptaTerminos ? "true" : "false");
    return pedir("/probador", { method: "POST", form });
  },
};

// Precio con 2 decimales, formato argentino: 49999 -> "$49.999,00"
export const precio = (n) =>
  "$" + Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const NOMBRE_CATEGORIA = {
  remeras: "Remeras", vestidos: "Vestidos", pantalones: "Pantalones",
  polleras: "Polleras", camperas: "Camperas", buzos: "Buzos",
};
