# PrintGuard AI - Project Documentation

## 1. Abstract
PrintGuard AI is an intelligent, web-based pre-flight print analysis platform designed to bridge the gap between digital graphic design and physical print production. By leveraging automated analysis algorithms, the system evaluates uploaded design files (PDFs, Images, and Vector representations) for common print-readiness issues such as CMYK color space compliance, Total Area Coverage (TAC) ink limits, resolution DPI, and safety layout margins. It provides dynamic, interactive visual reporting and simulates physical print outcomes across various mediums (Matte, Glossy, Offset). Ultimately, PrintGuard AI empowers designers to achieve flawless print results, significantly minimizing costly misprints, color mismatching, and material waste in the printing industry.

## 2. System Modules

### 2.1 User Authentication & Management Module
Handles secure user registration and login flows. Utilizes Firebase Authentication (Google OAuth & Email/Password) synchronized seamlessly with a Supabase PostgreSQL database to store persistent user profiles, tier plans, and subscription metadata.

### 2.2 File Processing & Upload Module
Provides an intuitive drag-and-drop interface with local client-side parsing. It leverages the `FileReader` API and `react-pdf` web workers to instantly generate high-quality visual previews of heavy documents right in the browser before intensive server transmission occurs.

### 2.3 AI Analysis Engine (Backend Module)
A high-performance Python-based FastAPI service. It ingests the uploaded design parameters, infers structural document properties, and computes critical print metrics. This module is responsible for the heavy lifting: calculating ink coverage mapping, generating risk alerts, defining auto-fixes, and providing material simulation predictions.

### 2.4 Interactive Report & Visualization Module
A dynamic React dashboard that consumes the backend AI payload. It segregates the raw data into clean, interactive tabs (Summary, Color & Ink, Layout Safety, Typography, Print Prediction) utilizing custom charts and visual mockups. It also features a robust client-side PDF rendering engine (`html2canvas` and `jspdf`) allowing users to export their analytics report instantly.

### 2.5 Admin Portal Module
A centralized management table allowing system administrators to monitor real-time network health, track AI job processing metrics, and manage user bases through live data queries executed directly against the Supabase backend.

---

## 3. Software Requirements

**Frontend Architecture:**
*   **Core Framework:** React 18
*   **Build Tool:** Vite
*   **Styling Engine:** Tailwind CSS
*   **Icons & UI:** Lucide React
*   **Routing:** React Router DOM
*   **Document Processing:** `react-pdf` (Mozilla PDF.js wrapper), `html2canvas`, `jspdf`

**Backend Architecture:**
*   **Language:** Python 3.9+
*   **API Framework:** FastAPI
*   **Server:** Uvicorn
*   **Data Validation:** Pydantic / Python-Multipart

**Database & Cloud Infrastructure:**
*   **User Database:** Supabase (PostgreSQL)
*   **Authentication:** Firebase Auth
*   **Version Control:** Git / GitHub

---

## 4. Hardware Requirements

### 4.1 Server-Side (Deployment Infrastructure)
*   **CPU:** 2+ Cores (Required for concurrent FastAPI Python analysis processing).
*   **RAM:** 1GB minimum (2GB+ recommended for handling large multipart file uploads and temporary document storage in memory).
*   **Storage:** 10GB SSD (For basic server OS overhead and temporary file-buffer processing).
*   **Network:** High-bandwidth connection for rapid file ingestion.

### 4.2 Client-Side (End-User System)
*   **Device:** Desktop or Laptop computer (Highly recommended for detailed Desktop Publishing (DTP) visual review over mobile).
*   **Browser:** Modern Web Browser (Google Chrome, Mozilla Firefox, Microsoft Edge, or Apple Safari) with Web Worker and HTML5 Canvas support enabled.
*   **RAM:** 4GB minimum (8GB recommended for natively rendering complex client-side PDF layers and generating large canvas PDF exports).
*   **Display:** Minimum 1080p resolution for accurate color review and layout inspection.
