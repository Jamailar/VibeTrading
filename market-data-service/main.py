from fastapi import FastAPI
import os

app = FastAPI(title="VibeTrading Market Data Service", version="0.1.0")

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "VibeTrading Market Data Service"}

