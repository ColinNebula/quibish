# Quibish Python services

Optional companion tooling. The chat keeps working if none of this is running.

## Setup
```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Tests (boots the Node backend itself on a free port)
```powershell
.venv\Scripts\python.exe -m pytest -q
# or against a running server:  $env:QUIBISH_URL="http://localhost:5001"; $env:JWT_SECRET="..."
```
Covers WebSocket auth, private delivery, offline queue replay/cap, call-signaling identity, search and media.

## Load test
```powershell
.venv\Scripts\python.exe loadtest\load_ws.py --url http://localhost:5001 --users 200 --messages 20 --secret <backend JWT_SECRET>
```

## API service
```powershell
.venv\Scripts\python.exe -m uvicorn main:app --port 8000
```
Uses the same JWT as the Node backend (reads `JWT_SECRET` or `backend/.env`).

- `POST /search/index`, `POST /search/index/bulk`, `DELETE /search/index/{id}`, `GET /search?q=`: per-user search index.
  Default embedder is a typo-tolerant hashing embedder (not truly semantic). `QUIBISH_EMBEDDER=sbert` after
  `pip install sentence-transformers` enables real semantic matching.
  Only index content the server is allowed to see: end-to-end encrypted text must not be sent here.
- `POST /media/image/inspect|optimize|thumbnail`: validates real image content, strips EXIF/GPS, applies rotation, bounds size.
## Using it from the React app

Start the service with `npm run py:api`, then set `REACT_APP_PY_SERVICES_URL=http://localhost:8000` (e.g. in `.env.local`) and restart `npm start`. Search results are merged with the local index and uploaded images are optimized by `/media/image/optimize`. Without the variable, or if the service is down, the app uses its built-in local behaviour. End-to-end encrypted messages are never sent to the service. Extra CORS origins: `QUIBISH_CORS_ORIGINS` (comma-separated).
