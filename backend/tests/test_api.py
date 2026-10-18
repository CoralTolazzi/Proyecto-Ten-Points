"""Tests de la API. Correr desde la carpeta backend:  pytest"""
import pytest
from fastapi.testclient import TestClient

S1 = {"X-Sesion": "sesion-test-0001"}
S2 = {"X-Sesion": "sesion-test-0002"}


@pytest.fixture
def api(tmp_path, monkeypatch):
    monkeypatch.setenv("TEN_POINTS_DB", str(tmp_path / "test.db"))
    from app.main import app
    with TestClient(app) as c:
        yield c


def variante(api, producto_id=1):
    p = api.get(f"/api/productos/{producto_id}").json()
    return p, p["colores"][0]["id"], p["talles"][0]["id"]


# ---------- catálogo ----------
def test_salud(api):
    assert api.get("/api/salud").json() == {"ok": True, "productos": 150}


def test_categorias_tienen_25(api):
    cats = api.get("/api/categorias").json()
    assert [c["categoria"] for c in cats] == ["remeras", "vestidos", "pantalones", "polleras", "camperas", "buzos"]
    assert all(c["cantidad"] == 25 for c in cats)


def test_filtrar_por_categoria_y_paginar(api):
    r = api.get("/api/productos", params={"categoria": "vestidos", "por_pagina": 10, "pagina": 3}).json()
    assert r["total"] == 25 and len(r["items"]) == 5
    assert all(i["categoria"] == "vestidos" for i in r["items"])


def test_categoria_inexistente(api):
    assert api.get("/api/productos", params={"categoria": "zapatos"}).status_code == 404


def test_busqueda_sin_tildes(api):
    r = api.get("/api/productos", params={"q": "pantalon"}).json()
    assert r["total"] > 0
    assert "Pantalón" in r["items"][0]["nombre"]


def test_filtro_color_talle_y_precio(api):
    r = api.get("/api/productos", params={"color": "Negro", "talle": "M", "precio_max": 100000, "por_pagina": 100}).json()
    assert r["total"] > 0
    for i in r["items"]:
        assert "Negro" in [c["nombre"] for c in i["colores"]]
        assert "M" in i["talles"]
        assert i["precio"] <= 100000


def test_orden_por_precio(api):
    precios = [i["precio"] for i in api.get("/api/productos", params={"orden": "precio_asc", "por_pagina": 100}).json()["items"]]
    assert precios == sorted(precios)


def test_detalle_trae_colores_y_medidas(api):
    p = api.get("/api/productos/1").json()
    assert p["colores"][0]["hex"].startswith("#")
    assert p["talles"][0]["busto_cm"]["min"] > 0
    pant = api.get("/api/productos", params={"categoria": "pantalones"}).json()["items"][0]
    t = api.get(f"/api/productos/{pant['id']}").json()["talles"][0]
    assert t["talle"].isdigit() and t["largo_entrepierna_cm"] and t["busto_cm"] is None


def test_relacionados_misma_categoria(api):
    rel = api.get("/api/productos/30/relacionados").json()
    cat = api.get("/api/productos/30").json()["categoria"]
    assert len(rel) == 6 and all(r["categoria"] == cat and r["id"] != 30 for r in rel)


def test_producto_inexistente(api):
    assert api.get("/api/productos/9999").status_code == 404


# ---------- carrito ----------
def test_carrito_requiere_sesion(api):
    assert api.get("/api/carrito").status_code == 422
    assert api.get("/api/carrito", headers={"X-Sesion": "x"}).status_code == 400


def test_carrito_suma_y_separa_sesiones(api):
    p, color, talle = variante(api)
    item = {"producto_id": 1, "color_id": color, "talle_id": talle, "cantidad": 2}
    api.post("/api/carrito/items", json=item, headers=S1)
    c = api.post("/api/carrito/items", json=item, headers=S1).json()
    assert len(c["items"]) == 1 and c["items"][0]["cantidad"] == 4
    assert c["subtotal"] == p["precio"] * 4
    assert api.get("/api/carrito", headers=S2).json()["items"] == []


def test_carrito_rechaza_color_de_otra_prenda(api):
    _, _, talle = variante(api, 1)
    _, color_otro, _ = variante(api, 2)
    r = api.post("/api/carrito/items", json={"producto_id": 1, "color_id": color_otro, "talle_id": talle}, headers=S1)
    assert r.status_code == 422


def test_envio_gratis_desde_150000(api):
    p, color, talle = variante(api, 1)
    c = api.post("/api/carrito/items", json={"producto_id": 1, "color_id": color, "talle_id": talle}, headers=S1).json()
    if p["precio"] < 150000:
        assert c["costo_envio"] == 6999 and c["total"] == p["precio"] + 6999
    item_id = c["items"][0]["id"]
    c = api.patch(f"/api/carrito/items/{item_id}", json={"cantidad": 10}, headers=S1).json()
    assert c["costo_envio"] == 0 and c["falta_para_envio_gratis"] == 0


def test_envio_gratis_redondeado():
    from app.routers.carrito import falta_para_envio_gratis
    assert falta_para_envio_gratis(150_000) == 0
    assert falta_para_envio_gratis(149_999) == 0   # $149.999 -> gratis
    assert falta_para_envio_gratis(149_000) == 0   # $149.000 -> gratis
    assert falta_para_envio_gratis(148_999) == 1   # ya no
    assert falta_para_envio_gratis(100_000) == 49_000


def test_prenda_de_149999_tiene_envio_gratis(api):
    prods = api.get("/api/productos", params={"precio_min": 149_000, "precio_max": 149_999, "por_pagina": 1}).json()["items"]
    assert prods, "no hay prendas entre $149.000 y $149.999 en el dataset"
    p, color, talle = variante(api, prods[0]["id"])
    c = api.post("/api/carrito/items", json={"producto_id": p["id"], "color_id": color, "talle_id": talle}, headers=S1).json()
    assert c["costo_envio"] == 0 and c["total"] == p["precio"] and c["falta_para_envio_gratis"] == 0


def test_quitar_item(api):
    _, color, talle = variante(api)
    c = api.post("/api/carrito/items", json={"producto_id": 1, "color_id": color, "talle_id": talle}, headers=S1).json()
    item_id = c["items"][0]["id"]
    assert api.delete(f"/api/carrito/items/{item_id}", headers=S2).status_code == 404  # no es de S2
    assert api.delete(f"/api/carrito/items/{item_id}", headers=S1).json()["items"] == []


# ---------- perchero ----------
def test_perchero_no_duplica(api):
    _, color, _ = variante(api)
    api.post("/api/perchero", json={"producto_id": 1, "color_id": color}, headers=S1)
    per = api.post("/api/perchero", json={"producto_id": 1, "color_id": color}, headers=S1).json()
    assert len(per) == 1 and per[0]["color"]["id"] == color
    assert api.delete(f"/api/perchero/{per[0]['id']}", headers=S1).json() == []


def test_perchero_tope(api):
    for pid in range(1, 13):
        _, color, _ = variante(api, pid)
        assert api.post("/api/perchero", json={"producto_id": pid, "color_id": color}, headers=S1).status_code == 201
    _, color, _ = variante(api, 13)
    assert api.post("/api/perchero", json={"producto_id": 13, "color_id": color}, headers=S1).status_code == 409


# ---------- compra ----------
CLIENTE = {"nombre": "Coral", "apellido": "Tolazzi", "email": "cori@ejemplo.com",
           "direccion": "Calle Falsa 123", "ciudad": "Quilmes", "codigo_postal": "1878"}
VISA_OK = {"numero": "4111 1111 1111 1111", "titular": "CORAL TOLAZZI", "vencimiento": "12/30", "cvv": "123"}


def comprar(api, envio="retiro", tarjeta=VISA_OK, cliente=CLIENTE, headers=S1):
    return api.post("/api/pedidos", json={"cliente": cliente, "envio": envio, "tarjeta": tarjeta}, headers=headers)


def llenar_carrito(api, headers=S1):
    p, color, talle = variante(api)
    api.post("/api/carrito/items", json={"producto_id": 1, "color_id": color, "talle_id": talle}, headers=headers)
    return p


def test_compra_vacia(api):
    assert comprar(api).status_code == 409


def test_compra_completa(api):
    p = llenar_carrito(api)
    r = comprar(api)
    assert r.status_code == 201
    ped = r.json()
    assert ped["numero"].startswith("TP-") and ped["costo_envio"] == 0 and ped["total"] == p["precio"]
    assert ped["pago"] == "Visa terminada en 1111"
    assert ped["cliente"]["apellido"] == "Tolazzi"
    assert "4111111111111111" not in r.text  # el número completo no se guarda ni se devuelve
    assert api.get("/api/carrito", headers=S1).json()["items"] == []  # se vació
    assert api.get(f"/api/pedidos/{ped['id']}", headers=S1).json()["numero"] == ped["numero"]
    assert api.get(f"/api/pedidos/{ped['id']}", headers=S2).status_code == 404


def test_compra_pide_datos(api):
    llenar_carrito(api)
    assert comprar(api, envio="domicilio", cliente={**CLIENTE, "direccion": None}).status_code == 422
    assert comprar(api, cliente={**CLIENTE, "email": "no-es-mail"}).status_code == 422
    sin_apellido = {k: v for k, v in CLIENTE.items() if k != "apellido"}
    assert comprar(api, cliente=sin_apellido).status_code == 422


@pytest.mark.parametrize("cambio, campo", [
    ({"numero": "4111 1111 1111 1112"}, "numero"),          # no pasa Luhn
    ({"numero": "6011 1111 1111 1117"}, "numero"),          # marca no aceptada
    ({"vencimiento": "01/20"}, "vencimiento"),              # vencida
    ({"vencimiento": "13/30"}, "vencimiento"),              # mes inválido
    ({"cvv": "12"}, "cvv"),
    ({"numero": "3782 822463 10005", "cvv": "123"}, "cvv"),  # Amex pide 4
])
def test_tarjeta_invalida(api, cambio, campo):
    llenar_carrito(api)
    r = comprar(api, tarjeta={**VISA_OK, **cambio})
    assert r.status_code == 402 and r.json()["detail"]["campo"] == campo
    assert len(api.get("/api/carrito", headers=S1).json()["items"]) == 1  # el carrito no se tocó


def test_tarjeta_rechazada_por_el_banco(api):
    llenar_carrito(api)
    r = comprar(api, tarjeta={**VISA_OK, "numero": "4000 0000 0000 0002"})
    assert r.status_code == 402 and "fondos insuficientes" in r.json()["detail"]["mensaje"]
    assert api.get("/api/pedidos", headers=S1).json() == []


def test_otras_marcas_aprobadas(api):
    llenar_carrito(api)
    r = comprar(api, tarjeta={**VISA_OK, "numero": "5555 5555 5555 4444"})
    assert r.json()["pago"] == "Mastercard terminada en 4444"
    llenar_carrito(api)
    r = comprar(api, tarjeta={**VISA_OK, "numero": "3782 822463 10005", "cvv": "1234"})
    assert r.json()["pago"] == "American Express terminada en 0005"


# ---------- probador ----------
def test_probador_sin_modelo(api):
    assert api.get("/api/probador/estado").json()["disponible"] is False
    _, color, _ = variante(api)
    per = api.post("/api/perchero", json={"producto_id": 1, "color_id": color}, headers=S1).json()
    r = api.post("/api/probador", data={"item_perchero_id": per[0]["id"], "acepta_terminos": "true"},
                 files={"foto": ("yo.jpg", b"\xff\xd8\xff fake", "image/jpeg")}, headers=S1)
    assert r.status_code == 503 and "todavía no" in r.json()["detail"]


def test_probador_con_modelo_de_prueba(api, monkeypatch):
    class ModeloFalso:
        nombre = "falso"
        def probar(self, foto, url, categoria):
            assert url.startswith("https://") and categoria
            return b"\x89PNG imagen"
    monkeypatch.setattr("app.routers.probador.obtener_modelo", lambda: ModeloFalso())
    _, color, _ = variante(api)
    per = api.post("/api/perchero", json={"producto_id": 1, "color_id": color}, headers=S1).json()
    r = api.post("/api/probador", data={"item_perchero_id": per[0]["id"], "acepta_terminos": "true"},
                 files={"foto": ("yo.png", b"x", "image/png")}, headers=S1)
    assert r.status_code == 200 and r.content == b"\x89PNG imagen"
    r = api.post("/api/probador", data={"item_perchero_id": per[0]["id"], "acepta_terminos": "true"},
                 files={"foto": ("yo.gif", b"x", "image/gif")}, headers=S1)
    assert r.status_code == 415


def test_probador_pide_aceptar_terminos(api):
    _, color, _ = variante(api)
    per = api.post("/api/perchero", json={"producto_id": 1, "color_id": color}, headers=S1).json()
    for data in ({"item_perchero_id": per[0]["id"]}, {"item_perchero_id": per[0]["id"], "acepta_terminos": "false"}):
        r = api.post("/api/probador", data=data, files={"foto": ("yo.jpg", b"x", "image/jpeg")}, headers=S1)
        assert r.status_code == 403 and "términos" in r.json()["detail"]


def test_probador_replicate_clase(monkeypatch):
    from app.ia.probador import ReplicateIdmVton, obtener_modelo

    # Simular ejecución exitosa de Replicate
    class ReplicateClienteMock:
        def run(self, model, input):
            assert "human_img" in input
            assert input["category"] == "upper_body"
            return b"\x89PNG resultado_vton"

    modelo = ReplicateIdmVton(token="token_de_prueba")
    modelo.client = ReplicateClienteMock()
    resultado = modelo.probar(b"foto_bytes", "https://ejemplo.com/prenda.jpg", "remeras")
    assert resultado == b"\x89PNG resultado_vton"

    # Verificar que obtener_modelo reconozca el token
    monkeypatch.setenv("REPLICATE_API_TOKEN", "token_prueba_123")
    m = obtener_modelo()
    assert m.nombre == "IDM-VTON (Replicate)"
