from fastapi import FastAPI
from app.db.session import init_db

app = FastAPI(title="SuperLista API")

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def read_root():
    return {"message": "Bienvenido a SuperLista API"}
