FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt backend/requirements.lock.txt /app/backend/
RUN pip install --no-cache-dir -r backend/requirements.lock.txt
COPY backend /app/backend
COPY data /app/data
COPY public/data /app/public/data
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=8s --start-period=15s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready',timeout=5)"
RUN useradd --system --uid 10001 --home-dir /app civic
USER 10001
CMD ["uvicorn","backend.main:app","--host","0.0.0.0","--port","8000"]
