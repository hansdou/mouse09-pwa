FROM python:3.11-slim

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    xvfb \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatspi2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

# Instalar Google Chrome (SOLO UNA VEZ)
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# ✅ CREAR MÚLTIPLES RUTAS PARA CHROMEDRIVER (como busca tu código)
RUN mkdir -p /opt/chrome /app/drivers /usr/local/bin \
    && ln -s /usr/bin/chromedriver /usr/local/bin/chromedriver \
    && ln -s /usr/bin/chromedriver /opt/chrome/chromedriver \
    && ln -s /usr/bin/chromedriver /app/chromedriver

# Verificar instalaciones
RUN google-chrome --version
RUN chromedriver --version || echo "ChromeDriver version check failed"
RUN which google-chrome
RUN which chromedriver || echo "ChromeDriver not in PATH"

# ✅ VERIFICAR TODAS LAS RUTAS QUE BUSCA TU CÓDIGO
RUN ls -la /usr/bin/chromedriver || echo "No encontrado: /usr/bin/chromedriver"
RUN ls -la /usr/local/bin/chromedriver || echo "No encontrado: /usr/local/bin/chromedriver"
RUN ls -la /opt/chrome/chromedriver || echo "No encontrado: /opt/chrome/chromedriver"
RUN ls -la /app/chromedriver || echo "No encontrado: /app/chromedriver"

WORKDIR /app

# Copiar e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación
COPY . .

# Variables de entorno para Chrome y Selenium
ENV DISPLAY=:99
ENV CHROME_BIN=/usr/bin/google-chrome
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver
ENV PYTHONPATH=/app
ENV PORT=5000

# ✅ CREAR DIRECTORIOS PARA DESCARGAS Y TEMPORALES
RUN mkdir -p /tmp/sedapal_pdfs /tmp/chromedriver_downloads \
    && chmod 777 /tmp/sedapal_pdfs /tmp/chromedriver_downloads /tmp

# Dar permisos ejecutables
RUN chmod +x /usr/bin/google-chrome \
    && chmod +x /usr/bin/chromedriver || true

# Verificar estructura del proyecto
RUN ls -la /app/
RUN ls -la /app/api/

EXPOSE 5000

# ✅ TIMEOUT AUMENTADO PARA CHROME SETUP
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--timeout", "180", "--workers", "1", "api.sedapal:app"]