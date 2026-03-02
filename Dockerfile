# Stage 1: build frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

# Stage 2: Python API + serve built frontend
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and scripts
COPY app ./app
COPY scripts ./scripts

# Writable directory for SQLite DB (when using DATABASE_URL with /app/data/...)
RUN mkdir -p /app/data

# Copy built frontend from stage 1 (so FastAPI can serve SPA at /)
COPY --from=frontend-builder /frontend/dist ./frontend/dist

EXPOSE 8000

# Ensure tables exist and seed sample data (idempotent), then start API
# Run init_db as module so Python finds the app package (WORKDIR is /app)
CMD ["sh", "-c", "python -m scripts.init_db && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
