# PrintGuard AI 🖨️🤖

PrintGuard AI is an intelligent, web-based pre-flight print analysis platform designed to bridge the gap between digital graphic design and physical print production. By leveraging automated analysis algorithms, the system evaluates uploaded design files (PDFs, Images, and Vector representations) for common print-readiness issues such as CMYK color space compliance, Total Area Coverage (TAC) ink limits, resolution DPI, and safety layout margins.

---

## 🚀 Getting Started

To run PrintGuard AI locally, start the components:

### 1. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

### 2. Backend API (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
# source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 3. AI Engine (Flask)
```bash
cd ai-engine
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
# source venv/bin/activate
python app.py
```

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, React PDF, JSPDF
- **Backend:** Python 3.9+, FastAPI, Uvicorn, Pydantic
- **AI Engine:** Python, Flask, OpenCV / Image Processing libraries
- **Database & Auth:** Supabase (PostgreSQL), Firebase Auth
