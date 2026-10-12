import { useCallback, useEffect, useState } from "react";

// Carga datos de la API y maneja "cargando" y "error".
export function useCarga(funcion, deps) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cargar = useCallback(funcion, deps);

  const correr = useCallback(() => {
    let vivo = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    cargar()
      .then((datos) => vivo && setEstado({ datos, error: null, cargando: false }))
      .catch((error) => vivo && setEstado({ datos: null, error, cargando: false }));
    return () => { vivo = false; };
  }, [cargar]);

  useEffect(() => correr(), [correr]);
  return { ...estado, reintentar: correr };
}
