#!/usr/bin/env python3
"""
VibeTrading Backtest Engine
"""
import os
from fastapi import FastAPI
import uvicorn

app = FastAPI(title="VibeTrading Backtest Engine", version="0.1.0")

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "VibeTrading Backtest Engine"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8002"))
    uvicorn.run(app, host="0.0.0.0", port=port)

