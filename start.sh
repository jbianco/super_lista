#!/bin/bash

# Colores para la terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando SuperLista...${NC}"

# Función para detener ambos procesos al salir
trap "kill 0" EXIT

# 1. Iniciar Backend
echo -e "${GREEN}📦 Iniciando Backend (FastAPI) en puerto 8000...${NC}"
cd backend
source venv/bin/activate
export PYTHONPATH=$PYTHONPATH:.
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# 2. Iniciar Frontend
echo -e "${GREEN}💻 Iniciando Frontend (React) en puerto 5173...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${BLUE}✅ ¡Todo listo!${NC}"
echo -e "Web App: ${BLUE}http://localhost:5173${NC}"
echo -e "API Docs: ${BLUE}http://localhost:8000/docs${NC}"
echo -e "Presiona Ctrl+C para detener ambos servidores."

# Mantener el script activo
wait
