from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router as api_router

app = FastAPI(
    title="PrintGuard AI Report Engine",
    description="Backend engine for generating AI Print Analysis PDF Reports",
    version="1.0.0"
)

# Allow React frontend to access the API (Configured for any origin for deployment flexibility)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow any origin in production, or specify exact URLs like 'https://your-frontend.vercel.app'
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def health_check():
    return {"status": "operational", "service": "ReportLab PDF Engine"}
