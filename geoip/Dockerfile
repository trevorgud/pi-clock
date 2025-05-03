FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Mark the cache directory as a volume so Docker can manage persistence
VOLUME ["/data"]

ENV PYTHONUNBUFFERED=1 \
    CACHE_FILE=/data/cache.json

EXPOSE 8000
CMD ["python", "app.py"]
