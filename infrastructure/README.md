# SuperLista — Infraestructura en la Nube

## Arquitectura

```
                      Cloudflare
                         │
                   (Túnel opcional)
                         │
                    ┌────┴────┐
                    │  Caddy  │  ← Gateway: TLS, rate limit, security headers
                    │ :80/443 │
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────┴───┐ ┌───┴────┐ ┌───┴──────┐
         │ Nginx  │ │FastAPI │ │ SQLite   │
         │ SPA    │ │ Backend│ │ (volume) │
         │ (estático)│ │        │ │          │
         └────────┘ └────────┘ └──────────┘
```

**Principios de seguridad:**
- Solo el gateway (Caddy) expone puertos — frontend y backend **nunca** son accesibles directamente.
- TLS automático vía Let's Encrypt (Caddy).
- Security headers OWASP en cada respuesta.
- Rate limiting por IP en el gateway.
- Firewall de sistema (UFW) bloquea todo excepto SSH, 80, 443.
- Fail2Ban protege SSH de ataques de fuerza bruta.
- Opcional: Cloudflare Tunnel elimina la necesidad de abrir puertos por completo.

---

## Análisis de Plataformas Cloud

### Comparativa Free Tier (Julio 2026)

| Plataforma | Gratuito | RAM | CPU | ¿Duerme? | Ideal para |
|---|---|---|---|---|---|
| **Oracle Cloud Always Free** ✅ | Permanente | **12 GB** (ARM) | 2 OCPU | No | Máximo poder sin pagar |
| **Koyeb** ✅ | Permanente | 512 MB | 0.1 vCPU | No | Simple, sin ops |
| **Google Cloud Run** | 2M req/mes | hasta 32 GB | hasta 8 vCPU | Sí (scale-to-zero) | Auto-escalado serverless |
| **Render** | 750 h/mes | 512 MB | 0.1 vCPU | Sí (15 min) | Popular, amigable |
| **Railway** | $5 crédito | 1 GB | — | Sí | Mejor DX |

### Tabla de Costos (una vez superado el free tier)

| Plataforma | Costo mensual mínimo | VCPU | RAM | Notas |
|---|---|---|---|---|
| Oracle Cloud (PAYG) | ~$8 | 1 | 4 GB | Solo si excedes free tier |
| Hetzner VPS | ~$4.50 | 2 | 4 GB | Mejor relación precio/rendimiento de pago |
| Koyeb | $5.99 | 0.5 | 1 GB | Sin gestión de servidor |
| Render | $7 | 0.1 | 512 MB | Web service individual |
| Google Cloud Run | ~$5 | 0.5 | 2 GB | Pago por uso |

---

## Recomendación

### Opción A (⭐ Recomendada): Oracle Cloud + Cloudflare Tunnel

**Costo: $0/mes** | 12 GB RAM, 2 CPU ARM | Sin límite de tiempo

```
✅ 12 GB RAM — suficiente para Docker + Playwright + Chromium
✅ Sin límite de horas ni sleep
✅ Cloudflare Tunnel = sin puertos abiertos
✅ PostgreSQL, Load Balancer gratis incluidos
⚠️  Cuenta de Oracle requiere aprobación manual
⚠️  Gestión de servidor Linux (Docker hace fácil)
```

**Pasos:** `setup-vps.sh` → `setup-cloudflare-tunnel.sh` → `docker compose -f docker-compose.prod.yml up -d`

### Opción B (Simple): Koyeb

**Costo: $0/mes** | 512 MB RAM | Sin sleep

```
✅ Sin gestión de servidor — deploy desde GitHub
✅ Sin sleep — siempre disponible
✅ Sin tarjeta de crédito (a veces la pide)
⚠️  512 MB RAM — ajustado si usás Playwright
⚠️  ML sin token API no funcionará (no corre Chromium)
```

**Pasos:** Push a GitHub → Conectar repo en Koyeb → Usar `docker-compose.prod.yml`

### Opción C (Híbrido - Pago mínimo): Hetzner + Cloudflare Tunnel

**Costo: ~$4.50/mes** | 2 CPU, 4 GB RAM

```
✅ Mejor relación precio/rendimiento pago
✅ 4 GB RAM — suficiente para todo
✅ Cloudflare Tunnel = sin puertos abiertos
⚠️  $4.50/mes — no es gratis, pero es barato
```

---

## Guía de Deploy Paso a Paso

### 1. Preparar el servidor (VPS)

```bash
# Conectarse
ssh root@<IP_DEL_SERVIDOR>

# Descargar el repositorio
git clone https://github.com/jbianco/super_lista.git /opt/superlista
cd /opt/superlista

# Ejecutar setup
chmod +x infrastructure/setup-vps.sh
./infrastructure/setup-vps.sh

# Configurar variables de entorno
cp .env.prod.example .env.prod
nano .env.prod
# → Completar DOMAIN y JWT_SECRET_KEY

# Iniciar
docker compose -f docker-compose.prod.yml up -d
```

### 2. Opcional: Cloudflare Tunnel (sin puertos abiertos)

```bash
cd /opt/superlista
./infrastructure/setup-cloudflare-tunnel.sh
# → Te guía por la autenticación y configuración
```

### 3. Opcional: Desplegar en Koyeb

```yaml
# koyeb.yaml (en la raíz del repo)
name: superlista
services:
  - name: gateway
    image: caddy:2-alpine
    ports:
      - port: 80
    routes:
      - path: /
    volumes:
      - path: /etc/caddy/Caddyfile
        contents: |
          :80 {
            header X-Content-Type-Options nosniff
            header X-Frame-Options DENY
            header Strict-Transport-Security "max-age=31536000"
            rate_limit { zone dynamic { key {remote_host} events 60 window 1m } }
            handle_path /api/* { reverse_proxy localhost:8000 }
            handle { reverse_proxy localhost }
            encode gzip
          }
    depends_on:
      - backend
      - frontend

  - name: backend
    dockerfile: Dockerfile.backend
    env:
      - key: DATABASE_URL
        value: sqlite:///data/superlista.db
      - key: JWT_SECRET_KEY
        secret: jwt_secret
      - key: CORS_ORIGINS
        value: https://superlista.koyeb.app
      - key: USE_REAL_CART
        value: "false"
    volumes:
      - path: /app/data
        size_gb: 1

  - name: frontend
    dockerfile: Dockerfile.frontend
```

Push a GitHub, conectá el repo en Koyeb, y seleccioná `koyeb.yaml`.

### 4. DNS

Configurá un registro A (o CNAME si usás Cloudflare Tunnel) apuntando a la IP de tu servidor.

---

## Seguridad Aplicada

| Capa | Medida |
|---|---|
| **Gateway** | Caddy: TLS 1.3, HSTS, CSP, rate limiting |
| **Red** | Solo puertos 80/443 abiertos (UFW) |
| **SSH** | Fail2Ban, solo key-based auth |
| **Contenedores** | Sin puertos expuestos en backend/frontend |
| **API** | Rate limiting por slowapi (60/min global) |
| **Autenticación** | JWT con hash SHA-256 + salt |
| **CORS** | Restringido al dominio del gateway |
| **Cloudflare Tunnel** | Sin IP pública visible, túnel cifrado post-quántum |
| **CSP** | `default-src 'self'` — previene XSS |

---

## Monitoreo Rápido

```bash
# Ver logs de todos los servicios
docker compose -f docker-compose.prod.yml logs -f

# Ver logs del gateway
docker compose -f docker-compose.prod.yml logs -f gateway

# Ver healthchecks
docker compose -f docker-compose.prod.yml ps

# Ver uso de recursos
docker stats

# Respaldar base de datos
docker compose -f docker-compose.prod.yml exec backend sh -c "cp /app/data/superlista.db /app/data/superlista.backup.db"
# El backup está en el volume backend_data
```

---

## Preguntas Frecuentes

**¿Playwright funciona en el servidor?**
Sí, en Oracle Cloud (12 GB RAM) o Hetzner (4 GB+) funciona sin problemas. El `Dockerfile.backend` ya instala Chromium. En Koyeb (512 MB) es probable que no tenga suficiente RAM — desactivá `USE_REAL_CART` y usá `ML_ACCESS_TOKEN` para MercadoLibre.

**¿Cómo migro la base de datos?**
SQLite se guarda en el volume `backend_data`. Para migrar a un nuevo servidor:
```bash
docker compose -f docker-compose.prod.yml exec backend sh -c "cat /app/data/superlista.db"
# Redirigir a archivo, copiar al nuevo servidor, y restaurar.
```

**¿Puedo usar PostgreSQL en vez de SQLite?**
Sí, pero requiere cambios en `DATABASE_URL` y agregar el servicio de PostgreSQL. El modelo usa SQLModel que es compatible con PostgreSQL. No incluido en esta capa de infraestructura por simplicidad y costo (free tier).

**¿Qué hago si Oracle reclama la VM por inactividad?**
Oracle reclama VMs con <20% de CPU/red/memoria por 7 días. SuperLista responde a requests HTTP, así que mientras tengas tráfico o un healthcheck, no debería pasar. Igual es recomendable configurar un ping periódico (UptimeRobot o similar gratuito).

---

## Referencias

- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/tunnel/)
- [Oracle Cloud Always Free](https://www.oracle.com/cloud/free/)
- [Caddy Server](https://caddyserver.com/docs/)
- [Docker Compose](https://docs.docker.com/compose/)
