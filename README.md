# SuperLista 🛒🚀

SuperLista es un agregador inteligente de precios de supermercados que te ayuda a ahorrar tiempo y dinero. Compara presupuestos entre las principales cadenas de Argentina y automatiza tu compra.

## ✨ Características Principales

- **Comparativa Multitienda:** Evalúa tu lista en Carrefour, Changomas, Super Mami y Tadicor simultáneamente.
- **Plan de Ahorro Máximo (Splits):** Algoritmo que divide tu lista entre tiendas para obtener el precio más bajo posible.
- **Alternativas Inteligentes:** Agrupamiento de productos por similitud (Fuzzy Matching) para encontrar tu marca favorita en cualquier tienda.
- **Automatización de Carrito:** Integración con Playwright para llenar tu carrito automáticamente usando tus credenciales.
- **Compartir por WhatsApp:** Envía el presupuesto detallado con un solo clic.

## 🛠️ Requisitos

- Python 3.10+
- Node.js 18+
- Playwright (para automatización de carrito)

## 🚀 Guía de Inicio Rápido

### 1. Preparar el Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install --with-deps chromium
```

### 2. Ejecutar el Backend
```bash
# Desde la carpeta backend
export PYTHONPATH=$PYTHONPATH:.
uvicorn app.main:app --reload --port 8000
```

### 3. Preparar el Frontend
```bash
cd frontend
npm install
```

### 4. Ejecutar el Frontend
```bash
# Desde la carpeta frontend
npm run dev
```

## 📖 Cómo usar la Aplicación

1. **Selecciona tus Tiendas:** En la parte superior, marca los supermercados donde sueles comprar.
2. **Configura tus Cuentas:** Si quieres usar la función de "Llenar Carrito", haz clic en "Mis Cuentas" e ingresa tus usuarios.
3. **Crea tu Lista:** Escribe los productos (ej: "Leche entera", "Yerba mate 1kg") y presiona Enter.
4. **Calcula el Ahorro:** Haz clic en "Calcular Ahorro".
5. **Elige tu Opción:** 
   - Puedes elegir el **Plan de Ahorro Máximo** para pagar lo mínimo posible dividiendo la compra.
   - O elegir un supermercado específico y presionar **"Llenar Carrito"** para automatizar la carga.
6. **WhatsApp:** Usa el botón de compartir para enviar la lista a tu familia o a ti mismo como recordatorio.

---
Generado con ❤️ por Gemini CLI.
