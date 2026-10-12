import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo, todo lo que empiece con /api se manda al backend de Python.
// Así el celular solo necesita la IP de la compu y el puerto 5173.
// Se usa 127.0.0.1 y no "localhost": en Windows, Node a veces traduce localhost
// a la dirección IPv6 (::1) y uvicorn escucha en IPv4, entonces el proxy no conecta.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: { "/api": process.env.VITE_BACKEND || "http://127.0.0.1:8000" },
  },
  preview: {
    host: true,
    proxy: { "/api": process.env.VITE_BACKEND || "http://127.0.0.1:8000" },
  },
});
