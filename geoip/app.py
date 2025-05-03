import os, json, time, logging, requests
from flask_cors import CORS
from threading import Thread, Event
from flask import Flask, jsonify

IPAPI_URL = os.getenv("IPAPI_URL", "https://ipapi.co/json")
CACHE_FILE = os.getenv("CACHE_FILE", "/data/cache.json")
REFRESH_TIMEOUT = int(os.getenv("REFRESH_TIMEOUT_SEC", "2"))
RETRY_INTERVAL = int(os.getenv("RETRY_INTERVAL_SEC", "300"))  # 5 minutes default

app = Flask(__name__)

# Enable CORS so a front‑end running on http://localhost:80 can call this API
CORS(app, resources={r"/*": {"origins": ["*"]}}, supports_credentials=False)

# Configure root logger so INFO‑level messages appear in `docker logs`
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s",
    force=True,
)
app.logger.setLevel(logging.getLevelName(os.getenv("LOG_LEVEL", "INFO")))

# Event used to stop the retry thread once we have a good cache
cache_ready = Event()


def read_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    return None


def write_cache(data):
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump(data, f)


def fetch_ipapi():
    app.logger.info("Attempting to fetch GeoIP from %s", IPAPI_URL)
    try:
        resp = requests.get(IPAPI_URL, timeout=REFRESH_TIMEOUT)
        resp.raise_for_status()
        app.logger.info("ipapi fetch succeeded with status %s", resp.status_code)
        return resp.json()
    except Exception as e:
        app.logger.warning("ipapi fetch failed: %s", e)
        return None


def retry_until_success():
    """Background thread that keeps hitting the public API until it succeeds."""
    while not cache_ready.is_set():
        data = fetch_ipapi()
        if data:
            write_cache(data)
            cache_ready.set()
            app.logger.info("Successfully updated cache from ipapi.co (background thread)")
            return
        app.logger.info("Retrying ipapi fetch in %s seconds", RETRY_INTERVAL)
        time.sleep(RETRY_INTERVAL)


def init_cache():
    app.logger.info("Initializing GeoIP cache …")
    data = fetch_ipapi()
    if data:
        write_cache(data)
        cache_ready.set()
        app.logger.info("Startup fetch succeeded; cache populated")
    else:
        if not os.path.exists(CACHE_FILE):
            write_cache({"error": "no data yet"})
        app.logger.warning(
            "Initial fetch failed; launching background retry thread every %s seconds",
            RETRY_INTERVAL,
        )
        Thread(target=retry_until_success, daemon=True).start()


@app.route("/geoip", methods=["GET"])
def geoip():
    """Return whatever is currently cached."""
    cache = read_cache()
    if cache:
        return jsonify(cache), 200
    return jsonify({"error": "no data available"}), 503


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": int(time.time())})


if __name__ == "__main__":
    # Fetch (and possibly schedule retries) before serving requests
    init_cache()
    app.run(host="0.0.0.0", port=8000)
