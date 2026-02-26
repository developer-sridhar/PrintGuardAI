from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any
from fastapi.responses import FileResponse
import tempfile
import os
import asyncio
import random

from services.pdf_generator import PrintReportGenerator

router = APIRouter()

class PrintAnalysisData(BaseModel):
    file_name: str
    client_name: str
    date: str
    paper_type: str
    print_method: str
    score: int
    safety_level: str
    resolution: str
    sharpness_score: str
    cmyk_coverage: Dict[str, float]
    tac: float
    ink_consumption: Dict[str, float]
    matte_prediction: str
    glossy_prediction: str
    offset_suitability: str
    digital_suitability: str
    risk_level: str
    auto_fixes: List[str]

@router.post("/report/generate")
async def generate_pdf_report(data: PrintAnalysisData):
    """
    Generate a 5-page PDF report based on the provided analysis data
    and return it as a downloadable file.
    """
    
    # Create a temporary file to store the PDF
    fd, temp_pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    
    try:
        # Generate the PDF
        generator = PrintReportGenerator(filename=temp_pdf_path, data=data.dict())
        generator.build_report()
        
        # Return the file response
        return FileResponse(
            path=temp_pdf_path, 
            media_type="application/pdf", 
            filename=f"Analysis_Report_{data.file_name}.pdf",
            background=None # File cleanup usually goes here
        )
    except Exception as e:
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)
        raise e

@router.post("/analyze")
async def analyze_design_file(file: UploadFile = File(...)):
    """
    Accepts an uploaded design file, simulates an AI analysis delay, 
    and returns a comprehensive JSON analytics payload matching the PrintAnalysisData schema.
    """
    # 1. Simulate AI Processing time (2.5 seconds)
    await asyncio.sleep(2.5)

    # 2. Extract basic file info
    file_name = file.filename
    client_name = "User Client" # Fallback or extracted from session
    
    # Generate some slightly randomized "AI" variance to make it feel real
    score = random.randint(82, 98)
    tac_value = random.uniform(160, 290)
    risk = "LOW" if score > 90 else "LOW-MEDIUM" if score > 85 else "MEDIUM"
    
    # 3. Construct the response payload
    analysis_data = {
        "file_name": file_name,
        "client_name": client_name,
        "date": "2024-03-24", # Static for mockup, usually dynamically generated
        "paper_type": "Matte 130gsm",
        "print_method": "Digital Press",
        "score": score,
        "safety_level": "HIGH" if score > 90 else "MEDIUM",
        "resolution": "300 DPI" if score > 85 else "150 DPI",
        "sharpness_score": f"{random.uniform(7.5, 9.8):.1f}",
        "cmyk_coverage": {
            "c": round(random.uniform(20, 60), 1), 
            "m": round(random.uniform(20, 50), 1), 
            "y": round(random.uniform(20, 50), 1), 
            "k": round(random.uniform(40, 80), 1)
        },
        "tac": round(tac_value, 1),
        "ink_consumption": {
            "c": round(random.uniform(0.01, 0.05), 3), 
            "m": round(random.uniform(0.01, 0.05), 3), 
            "y": round(random.uniform(0.01, 0.05), 3), 
            "k": round(random.uniform(0.03, 0.08), 3)
        },
        "matte_prediction": "Colors may appear 5-10% desaturated due to ink absorption.",
        "glossy_prediction": "Vibrant reproduction. Perfect for this color profile.",
        "offset_suitability": f"TAC is {round(tac_value)}% (below 300% limit). Excellent suitability.",
        "digital_suitability": "Good. Standard digital press handles this perfectly.",
        "risk_level": risk,
        "auto_fixes": [
            "Converted RGB to CMYK color profile",
            "Added 3mm safe bleed area",
            "Embedded missing fonts",
            "Optimized contrast for deeper blacks"
            if score < 95 else "Reduced overall ink overload (TAC)"
        ]
    }
    
    return analysis_data
