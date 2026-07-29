import os
import sys

# Ensure the backend package directory is on sys.path so that
# 'api', 'services', etc. are importable regardless of where
# uvicorn is launched from (e.g. `python -m uvicorn backend.main:app`
# run from the project root).
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
from dotenv import load_dotenv

# Load Environment Variables from the same directory as this file
env_path = os.path.join(_BACKEND_DIR, ".env")
load_dotenv(env_path)

import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Increase Starlette's default 1MB max_part_size limit for form payloads & base64 strings
import starlette.formparsers
_orig_multipart_init = starlette.formparsers.MultiPartParser.__init__
def _patched_multipart_init(self, *args, **kwargs):
    kwargs['max_part_size'] = 100 * 1024 * 1024  # 100 MB
    kwargs.setdefault('max_files', 5000)
    kwargs.setdefault('max_fields', 5000)
    return _orig_multipart_init(self, *args, **kwargs)
starlette.formparsers.MultiPartParser.__init__ = _patched_multipart_init
starlette.formparsers.MultiPartParser.max_file_size = 100 * 1024 * 1024  # 100 MB
starlette.formparsers.MultiPartParser.max_part_size = 100 * 1024 * 1024  # 100 MB

try:
    import multipart
    multipart.multipart.MAX_FILE_SIZE = 100 * 1024 * 1024
except Exception:
    pass

from api.routes import router as api_router
# from api.debug_routes import router as diag_router

# Initialize Firebase Admin SDK
cred_path = os.path.join(os.path.dirname(__file__), "firebase_key.json")
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    print("Firebase Admin SDK initialized successfully.")
else:
    print("WARNING: firebase_key.json not found. Firebase features will be disabled.")

app = FastAPI(
    title="PrintGuard AI Report Engine",
    description="Backend engine for generating AI Print Analysis PDF Reports",
    version="1.0.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
# app.include_router(diag_router, prefix="/api")

@app.get("/")
def health_check():
    return {"status": "operational", "service": "ReportLab PDF Engine"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
