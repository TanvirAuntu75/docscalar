# ==========================================
# Stage 1: Build the React Vite Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Build the FastAPI Backend & Package
# ==========================================
FROM python:3.11-slim AS backend-runner
WORKDIR /app

# Install system dependencies (Tesseract, Ghostscript, LibreOffice, and dependencies for Playwright)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    ghostscript \
    curl \
    default-jre \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install them
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install Playwright and browser dependencies
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy React built frontend from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Copy the rest of the backend files
COPY backend/ ./backend

# Environment variables
ENV PORT=8000
ENV HOST=0.0.0.0
ENV PYTHONPATH=/app

# Expose backend port
EXPOSE 8000

# Start server
CMD ["python", "-m", "backend.main"]

