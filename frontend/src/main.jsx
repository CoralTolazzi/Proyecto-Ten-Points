import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Aviso, BarraTabs } from "./components/Comunes";
import Buscar from "./pages/Buscar";
import Carrito from "./pages/Carrito";
import Compra, { CompraLista } from "./pages/Compra";
import Inicio from "./pages/Inicio";
import Probador from "./pages/Probador";
import Producto from "./pages/Producto";
import { TiendaProvider } from "./tienda";
import "./estilos.css";

// Si algo se rompe, mostrar el error en pantalla en vez de dejarla en blanco
class AtajaErrores extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 24, fontFamily: "system-ui", color: "#23123f" }}>
        <h1 style={{ fontSize: 22 }}>Ups, la app se rompió</h1>
        <p>Mandale esta captura a quien esté programando:</p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#fff", padding: 12, borderRadius: 8, border: "2px solid #23123f" }}>
          {String(this.state.error?.stack || this.state.error)}
        </pre>
        <button onClick={() => location.reload()} style={{ padding: "10px 18px", borderRadius: 999, border: "2px solid #23123f" }}>
          Recargar
        </button>
      </div>
    );
  }
}

function ArribaAlCambiar() {
  const { pathname } = useLocation();
  // Con llaves: en navegadores nuevos scrollTo devuelve una promesa, y un efecto
  // solo puede devolver una función de limpieza (si no, React tira "destroy is not a function").
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  const { pathname } = useLocation();
  const sinTabs = pathname.startsWith("/compra") || pathname.startsWith("/producto");
  return (
    <div className="app">
      <ArribaAlCambiar />
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/buscar" element={<Buscar />} />
        <Route path="/producto/:id" element={<Producto />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/compra" element={<Compra />} />
        <Route path="/compra/listo/:id" element={<CompraLista />} />
        <Route path="/probador" element={<Probador />} />
        <Route path="*" element={<Inicio />} />
      </Routes>
      {!sinTabs && <BarraTabs />}
      <Aviso />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AtajaErrores>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TiendaProvider>
          <App />
        </TiendaProvider>
      </BrowserRouter>
    </AtajaErrores>
  </React.StrictMode>,
);
