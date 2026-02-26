# PrintGuard AI System Architecture

This document outlines the high-level architecture, data flow, and component structure for the PrintGuard AI SaaS platform.

## High-Level System Flow

```mermaid
sequenceDiagram
    actor User as User
    participant React as React Frontend
    participant Fast as FastAPI Backend (Python)
    participant AI as AI Engine (External/Mock)
    participant Auth as Firebase Auth

    User->>React: Authenticates via Google/Phone
    React->>Auth: Validate Credentials
    Auth-->>React: Return JWT Token

    User->>React: Uploads Design File (PDF, AI, PSD)
    
    note over React, Fast: Dashboard parses basic metadata locally
    React->>Fast: Sends File & Metadata for Analysis
    
    Fast->>AI: Processes File for Color, TAC, DPI risks
    AI-->>Fast: Returns Analysis JSON payload
    
    Fast-->>React: Renders Report Dashboard mapping JSON
    
    User->>React: Clicks "Download PDF"
    React->>Fast: POST /api/report/generate (JSON)
    note right of Fast: ReportLab Engine constructs<br/>5-page Premium PDF
    Fast-->>React: Returns Streaming PDF FileResponse
    React-->>User: Prompts File Download
```

## Component Architecture

```mermaid
graph TD
    subgraph Frontend [React Frontend - Vite + Tailwind]
        App[App.jsx - Router]
        AuthC[AuthContext - Firebase]
        
        App --> AuthLay[Auth Layout]
        App --> DashLay[Dashboard Layout]
        
        DashLay --> Dash[Dashboard Page]
        DashLay --> Up[Upload Page]
        DashLay --> Rep[Report Page]
        DashLay --> Price[Pricing Matrix Page]
        
        Rep --> UZ[UploadZone Component]
        Rep --> SG[ScoreGauge Component]
        Rep --> IC[InkCoverageChart Component]
        Rep --> PC[PredictionCard Component]
    end

    subgraph Backend [Python Backend - FastAPI]
        API[main.py - Entry Point]
        Router[api/routes.py]
        Engine[services/pdf_generator.py]
        
        API --> Router
        Router --> |Validates Pydantic Models| Engine
        Engine --> |ReportLab Drawing| Output[Analysis.pdf]
    end

    subgraph Cloud [External Services]
        FBAuth[(Firebase Auth)]
    end

    AuthC <--> |Token Validation| FBAuth
    Rep <--> |JSON Payload / File Stream| API

    classDef react fill:#06b6d4,stroke:#0f172a,color:#fff
    classDef python fill:#eab308,stroke:#0f172a,color:#fff
    classDef cloud fill:#ef4444,stroke:#0f172a,color:#fff

    class Frontend,App,DashLay,Rep,Price react
    class Backend,API,Router,Engine python
    class Cloud,FBAuth cloud
```

## Infrastructure Tech Stack

**Frontend Layer:**
*   **Framework:** React 18 (Vite)
*   **Routing:** React Router DOM v6
*   **CSS Framework:** Tailwind CSS v3.4 (Custom Navy/Cyan Theme)
*   **Charting Visualization:** Chart.js + react-circular-progressbar
*   **Icons:** Lucide React

**Backend Core / AI Engine:**
*   **API Framework:** FastAPI (Python 3.x)
*   **PDF Generation:** ReportLab
*   **Data Validation:** Pydantic
*   **Image Processing:** Pillow (PIL)

**Infrastructure & Services:**
*   **Authentication:** Firebase Auth (Google Sign-In, Phone OTP with Invisible reCAPTCHA)
