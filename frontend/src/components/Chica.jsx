// Ilustraciones de las chicas: una por pantalla.
import chica1 from "../assets/chicas/chica1_jean.webp";
import chica2 from "../assets/chicas/chica2_pollera.webp";
import chica3 from "../assets/chicas/chica3_cargo.webp";
import chica4 from "../assets/chicas/chica4_celeste.webp";
import chica5 from "../assets/chicas/chica5_selfie.webp";

export const CHICAS = {
  inicio: chica1,    // top verde y jean
  buscar: chica2,    // top lila y pollera tableada
  carrito: chica3,   // top rosa y cargo negro
  compra: chica4,    // top celeste y jean celeste
  probador: chica5,  // selfie en el espejo: tutorial de la foto
};

// Son decorativas (alt vacío) salvo que se pase un texto alternativo.
export default function Chica({ cual, className = "", alt = "" }) {
  return <img src={CHICAS[cual]} alt={alt} className={`chica ${className}`} draggable="false" />;
}

// Tarjeta con texto a la izquierda y la chica asomándose a la derecha.
export function TarjetaChica({ cual, color = "rosa", children }) {
  return (
    <div className={`tarjeta-chica tarjeta-chica--${color}`}>
      <div className="tarjeta-chica__texto">{children}</div>
      <Chica cual={cual} className="tarjeta-chica__img" />
    </div>
  );
}
