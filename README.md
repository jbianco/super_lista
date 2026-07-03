# SuperLista 🛒🚀

SuperLista es un agregador inteligente de precios de supermercados que te ayuda a ahorrar tiempo y dinero. Compara presupuestos entre las principales cadenas de Argentina (Carrefour, Changomas, Disco, Jumbo, MercadoLibre) con datos reales vía API VTEX + Playwright.

## ✨ Características Principales

- **Comparativa Multitienda:** Evalúa tu lista en 4 supermercados + MercadoLibre simultáneamente con datos reales.
- **Plan de Ahorro Máximo (Splits):** Algoritmo que divide tu lista entre tiendas para obtener el precio más bajo posible.
- **Alternativas Inteligentes:** Cuando un producto no tiene stock, sugiere automáticamente alternativas similares.
- **Automatización de Carrito:** Integración con Playwright para llenar tu carrito automáticamente (Carrefour, feature flag).
- **Historial de Precios:** Registro automático de precios con gráfico de evolución y notificaciones de cambio.
- **PWA:** Instalable como app, con service worker y caché offline de la API.
- **Rate Limiting + Audit Logging:** 60 req/min global, 10/min register, 20/min login; log de todas las requests.
- **Autenticación JWT:** Registro, login, gestión de credenciales por tienda.
- **Docker + CI/CD:** Build multi-stage, docker-compose, GitHub Actions (test + lint + build).
- **Compartir por WhatsApp:** Envía el presupuesto detallado con un solo clic.

## 🛠️ Requisitos

- Python 3.13+
- Node.js 22+
- Docker (opcional, para deploy)

## 🚀 Guía de Inicio Rápido

### Con Docker (desarrollo local)
```bash
docker compose up --build
# Frontend: http://localhost:8080
# Backend API: http://localhost:8000
```

### Con Docker (producción)
```bash
# 1. Copiar y configurar variables de entorno
cp .env.prod.example .env.prod
nano .env.prod

# 2. Iniciar con gateway (Caddy + TLS automático)
docker compose -f docker-compose.prod.yml up -d
```

> Para despliegue en la nube, consultar [infrastructure/README.md](infrastructure/README.md) con análisis de plataformas free tier y guías paso a paso (Oracle Cloud, Koyeb, Render, etc.).

### Sin Docker

#### 1. Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install --with-deps chromium  # solo si usas carrito real
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🧪 Tests

```bash
# Backend (34 tests)
cd backend && python -m pytest

# Frontend (37 tests)
cd frontend && npm test

# TypeScript check
cd frontend && npx tsc --noEmit
```

## 📦 Scripts Útiles

```bash
# Regenerar tipos TypeScript desde OpenAPI
cd frontend && npm run api-types

# Build producción frontend
cd frontend && npm run build
```

## 🌐 Supermercados Soportados

| Supermercado | API | Carrito Real |
|---|---|---|
| Carrefour | VTEX Catalog API | Playwright (feature flag) |
| Changomas | VTEX Catalog API | - |
| Disco | VTEX Catalog API | - |
| Jumbo | VTEX Catalog API | - |
| MercadoLibre | Playwright / REST API | - |

## 🔐 Variables de Entorno

| Variable | Default | Descripción |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./superlista.db` | Conexión a BD |
| `JWT_SECRET_KEY` | `dev-secret-change-in-production` | Secreto JWT |
| `USE_REAL_CART` | `false` | Activar carrito con Playwright |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:80` | Orígenes CORS |
| `ML_ACCESS_TOKEN` | — | Token API MercadoLibre (opcional) |

## ☁️ Despliegue en la Nube

Consultar la [documentación de infraestructura](infrastructure/README.md) para:
- Análisis comparativo de plataformas cloud (Oracle Cloud, Koyeb, Render, etc.)
- Guía de deploy paso a paso con Docker Compose
- Configuración del gateway Caddy con TLS automático
- Cloudflare Tunnel para acceso sin puertos abiertos
- Seguridad: firewall, rate limiting, CSP, HSTS
