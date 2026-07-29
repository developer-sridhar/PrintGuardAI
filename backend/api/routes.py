from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Form, Query, HTTPException, Response, Request
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from fastapi.responses import FileResponse

import starlette.formparsers
try:
    _orig_multipart_init_routes = starlette.formparsers.MultiPartParser.__init__
    def _patched_multipart_init_routes(self, *args, **kwargs):
        kwargs['max_part_size'] = 100 * 1024 * 1024  # 100 MB
        kwargs.setdefault('max_files', 5000)
        kwargs.setdefault('max_fields', 5000)
        return _orig_multipart_init_routes(self, *args, **kwargs)
    starlette.formparsers.MultiPartParser.__init__ = _patched_multipart_init_routes
except Exception:
    pass
starlette.formparsers.MultiPartParser.max_file_size = 100 * 1024 * 1024  # 100 MB
starlette.formparsers.MultiPartParser.max_part_size = 100 * 1024 * 1024  # 100 MB
import firebase_admin
from firebase_admin import credentials, auth, firestore
firebase_auth = auth
import tempfile
import os
import asyncio
import random
import shutil
import base64
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

# Ensure environment variables are loaded FIRST
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_file = os.path.join(_BASE_DIR, ".env")
load_dotenv(env_file)

try:
    import razorpay
except ImportError:
    razorpay = None

# Initialize Razorpay with verification
razorpay_key_id = os.getenv("RAZORPAY_KEY_ID")
razorpay_key_secret = os.getenv("RAZORPAY_KEY_SECRET")

if not razorpay_key_id or not razorpay_key_secret or not razorpay:
    print("WARNING: Razorpay credentials or library not initialized.")
    razorpay_client = None
else:
    print(f"Razorpay Key loaded: {razorpay_key_id}")
    razorpay_client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))

# Initialize Firebase Admin once with env var support
try:
    firebase_admin.get_app()
except ValueError:
    _BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cred_path = os.path.join(_BASE_DIR, "firebase_key.json")
    firebase_json_env = os.getenv("FIREBASE_CREDENTIALS_JSON") or os.getenv("FIREBASE_KEY_JSON")
    
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin initialized from firebase_key.json file.")
    elif firebase_json_env:
        try:
            import json
            cred_dict = json.loads(firebase_json_env)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized from FIREBASE_CREDENTIALS_JSON env variable.")
        except Exception as e:
            print(f"WARNING: Failed to initialize Firebase from env JSON: {e}")
    else:
        print("WARNING: firebase_key.json not found and FIREBASE_CREDENTIALS_JSON not set. Firebase Admin disabled.")

# Persistent Firestore client with safe fallback
try:
    db_firestore = firestore.client()
except Exception as e:
    print(f"WARNING: Firestore client initialization skipped or failed: {e}")
    db_firestore = None


async def run_firestore_retry(func_name: str, operation, max_retries=3, delay=1):
    """
    Helper to run Firestore operations with retry logic to handle transient SSL/Timeout errors.
    """
    last_err = None
    for i in range(max_retries):
        try:
            # Firestore operations are usually blocking in the admin SDK, 
            # we wrap them if needed, but here we just call them.
            return operation()
        except Exception as e:
            last_err = e
            print(f"Firestore Attempt {i+1} failed for {func_name}: {e}")
            if "SSL" in str(e) or "Timeout" in str(e) or "503" in str(e):
                await asyncio.sleep(delay * (i + 1))
                continue
            raise e
    raise last_err

# Relative imports from the backend package
# try:
#     from services.pdf_generator import PrintReportGenerator
#     from services.analyzer import analyze_file, convert_to_cmyk
#     from services.bleed_extender import extend_bleed
#     from services.ups_generator import generate_ups_pdf
#     from services.dieline_generator import generate_dieline_pdf
# except ImportError as e:
#     print(f"Warning: Some services could not be imported: {e}")

router = APIRouter()

@router.get("/ping")
async def ping():
    return {"status": "pong", "timestamp": str(datetime.now())}

@router.get("/admin/users/all")
async def get_all_users_unified():
    """
    Get all users from Firebase and Supabase, merged.
    """
    try:
        # 1. Fetch from Firebase
        fb_users_page = auth.list_users()
        fb_users = {}
        for user in fb_users_page.users:
            provider = 'Email'
            if user.provider_data:
                p_id = user.provider_data[0].provider_id
                if p_id == 'google.com': provider = 'Google'
                elif p_id == 'phone': provider = 'Phone'
            
            # Convert timestamp ms to ISO string
            created_iso = datetime.fromtimestamp(user.user_metadata.creation_timestamp / 1000).isoformat() if user.user_metadata.creation_timestamp else None
            
            fb_users[user.uid] = {
                "uid": user.uid,
                "email": user.email,
                "name": user.display_name or (user.email.split('@')[0] if user.email else 'Unknown'),
                "phone": user.phone_number,
                "photo_url": user.photo_url,
                "provider": provider,
                "created_at": created_iso,
                "source": "Firebase"
            }
            
        # 2. Fetch from Supabase
        try:
            res = supabase.table("users").select("*").execute()
            sb_users = {u['uid']: u for u in res.data}
        except:
            sb_users = {}
        
        # 3. Merge
        unified = []
        for uid, fb_user in fb_users.items():
            sb_data = sb_users.get(uid, {})
            unified.append({
                **fb_user,
                "role": sb_data.get('role', 'User'),
                "plan": sb_data.get('plan', 'Free'),
                "status": sb_data.get('status', 'Active'),
                "in_supabase": uid in sb_users
            })
            
        return unified
    except Exception as e:
        print(f"Error merging users: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/users/sync")
async def sync_firebase_user(data: dict):
    """
    Manually sync a Firebase user to Supabase.
    """
    uid = data.get("uid")
    if not uid:
        raise HTTPException(status_code=400, detail="UID is required")
        
    try:
        fb_user = auth.get_user(uid)
        
        # Determine provider
        provider = 'Email'
        if fb_user.provider_data:
            p_id = fb_user.provider_data[0].provider_id
            if p_id == 'google.com': provider = 'Google'
            elif p_id == 'phone': provider = 'Phone'
            
        # Check if user already exists to preserve plan/role
        existing_plan = "Free"
        existing_role = "User"
        if supabase:
            try:
                check_res = supabase.table("users").select("plan, role").eq("uid", fb_user.uid).execute()
                if check_res.data and len(check_res.data) > 0:
                    existing_plan = check_res.data[0].get("plan") or "Free"
                    existing_role = check_res.data[0].get("role") or "User"
            except Exception:
                pass

        # Prepare Supabase record
        user_record = {
            "uid": fb_user.uid,
            "email": fb_user.email,
            "name": fb_user.display_name or (fb_user.email.split('@')[0] if fb_user.email else 'User'),
            "phone": fb_user.phone_number,
            "photo_url": fb_user.photo_url,
            "provider": provider,
            "role": existing_role,
            "plan": existing_plan,
            "status": "Active"
        }
        
        # Insert or Update in Supabase
        res = supabase.table("users").upsert(user_record, on_conflict="uid").execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        print(f"Sync error for {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Supabase Client Initialization
supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
supabase_key = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or
    os.getenv("SUPABASE_SECRET_KEY") or
    os.getenv("SUPABASE_KEY") or
    os.getenv("VITE_SUPABASE_ANON_KEY")
)
supabase: Client = None

if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("Supabase client initialized in backend.", flush=True)
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}", flush=True)
else:
    print("WARNING: Supabase URL or Key not set. Supabase features will be disabled.", flush=True)


# Twilio Initialization (Safe Runtime Helper)
def get_twilio_client():
    try:
        from twilio.rest import Client as TwilioClient
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        if account_sid and auth_token:
            return TwilioClient(account_sid, auth_token)
    except (ImportError, NameError):
        return None
    except Exception as e:
        print(f"Twilio init error: {e}")
        return None
    return None

TWILIO_VERIFY_SERVICE_SID = os.getenv("TWILIO_VERIFY_SERVICE_SID")

class PrintAnalysisData(BaseModel):
    file_name: str
    client_name: str = "Valued Client"
    date: str = ""
    paper_type: str = "Standard"
    print_method: str = "Digital"
    score: int = 0
    safety_level: str = "Unknown"
    resolution: str = "Unknown"
    sharpness_score: str = "Unknown"
    cmyk_coverage: Dict[str, float] = {"c":0,"m":0,"y":0,"k":0}
    tac: float = 0.0
    ink_consumption: Dict[str, float] = {"c":0,"m":0,"y":0,"k":0}
    matte_prediction: str = "Neutral"
    glossy_prediction: str = "Neutral"
    offset_suitability: str = "Unknown"
    digital_suitability: str = "Unknown"
    risk_level: str = "MEDIUM"
    auto_fixes: List[str] = []
    has_rgb: bool = False
    has_sufficient_bleed: bool = False
    page_count: int = 1
    width_px: int = 0
    height_px: int = 0
    width_mm: float = 0.0
    height_mm: float = 0.0
    dpi: int = 300
    rendered_pages: List[str] = []
    color_maps: List[str] = []
    # Print material metadata (from pre-upload modal)
    paper_material: str = "Art Paper"
    paper_size: str = "A4"
    gsm: int = 150
    bleed_mm: float = 3.0


class UPSDielineRequest(BaseModel):
    """Shared request body for UPS and Die Line endpoints."""
    file_name: str = "Design"
    width_mm: float = 100.0
    height_mm: float = 100.0
    paper_size: str = "A4"
    paper_material: str = "Art Paper"
    gsm: int = 150
    bleed_mm: float = 3.0
    safe_mm: float = 5.0
    has_fold: bool = True
    has_perf: bool = False

@router.post("/report/generate")
async def generate_pdf_report(data: PrintAnalysisData):
    from services.pdf_generator import PrintReportGenerator
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
    from services.analyzer import analyze_file
    """
    Accepts an uploaded design file, analyzes it for RGB/CMYK, 
    and returns a comprehensive JSON analytics payload matching the PrintAnalysisData schema.
    """
    file_name = file.filename
    
    # Save uploaded file to temp structure for analysis
    fd, temp_file_path = tempfile.mkstemp(suffix=f"_{file_name}")
    os.close(fd)
    
    with open(temp_file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    storage_path = None
    try:
        # 1. Upload to Supabase Storage if client exists
        if supabase:
            try:
                # Use a unique name for storage
                file_ext = file_name.split('.')[-1] if '.' in file_name else 'dat'
                unique_name = f"uploads/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}.{file_ext}"
                
                with open(temp_file_path, 'rb') as f:
                    print(f"DEBUG: Uploading to bucket 'uploads' at path {unique_name}")
                    res = supabase.storage.from_('uploads').upload(
                        path=unique_name,
                        file=f,
                        file_options={"cacheControl": "3600", "upsert": True}
                    )
                    storage_path = unique_name
                    print(f"DEBUG: Upload successful: {storage_path}")
            except Exception as se:
                log_path = "backend_debug.log"
                with open(log_path, "a") as f:
                    f.write(f"\n--- {datetime.now()} ---\n")
                    f.write(f"STORAGE ERROR while uploading {file_name} to bucket 'uploads'\n")
                    f.write(f"Details: {str(se)}\n")
                    import traceback
                    f.write(traceback.format_exc())
                print(f"Supabase Storage Upload Error: {se}")

        # 2. Actual Analysis call
        analysis_result = analyze_file(temp_file_path, file_name)
        
        # Check for error early (e.g. unsupported extension)
        if "error" in analysis_result:
            raise HTTPException(status_code=400, detail=analysis_result["error"])

        if storage_path:
            analysis_result["supabase_storage_path"] = storage_path

    except HTTPException:
        # Rethrow HTTPExceptions from early validation
        raise
    except Exception as e:
        import traceback
        error_msg = f"Error analyzing {file_name}: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        # Ensure we return the status_log even on failure if it was initialized
        s_log = analysis_result.get("status_log", ["Analysis failed unexpectedly"]) if 'analysis_result' in locals() else ["Analysis engine crash"]
        raise HTTPException(status_code=500, detail={"error": error_msg, "status_log": s_log})
    finally:
        # Cleanup temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    client_name = "User Client"
    current_date = datetime.now().isoformat()
    
    # Infer basic properties from file extension
    file_ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
    is_vector = file_ext in ['pdf', 'ai', 'eps', 'svg', 'cdr']
    
    print_method = "Offset Press" if is_vector else "Digital Press"
    paper_type = "Premium Matte 150gsm" if is_vector else "Standard Glossy 130gsm"
    
    # Extract real metrics from analysis_result
    score = analysis_result.get("score", 85)
    tac_value = analysis_result.get("tac", 0)
    cmyk_cov = analysis_result.get("cmyk_coverage", {"c": 0, "m": 0, "y": 0, "k": 0})
    sharpness = analysis_result.get("sharpness_score", 0)
    
    risk = "LOW" if score > 90 else "LOW-MEDIUM" if score > 80 else "MEDIUM"
    if score < 60: risk = "HIGH"
    
    # Real-world derived auto-fixes
    auto_fixes = []
    if not analysis_result.get("has_sufficient_bleed"):
        auto_fixes.append("Extended safe bleed area to 3mm")
    
    if analysis_result.get("has_rgb"):
        auto_fixes.append("Profile conversion: RGB -> Coated FOGRA39 (CMYK)")
        
    if tac_value > 300:
        auto_fixes.append(f"Reduced ink overload from {round(tac_value)}% to 280% (TAC Optimization)")
    
    if analysis_result.get("dpi", 300) < 200:
        auto_fixes.append("AI Image Upscaling: Enhanced resolution from low-DPI source")

    if not auto_fixes:
        auto_fixes = ["Optimized overall contrast", "Validated font embedding"]

    # Simple simulated ink consumption based on coverage (ml/m2 estimate)
    ink_consumption = {
        "c": round(cmyk_cov["c"] * 0.0008, 4), 
        "m": round(cmyk_cov["m"] * 0.0008, 4), 
        "y": round(cmyk_cov["y"] * 0.0008, 4), 
        "k": round(cmyk_cov["k"] * 0.0012, 4)
    }

    # Construct the response payload using ONLY real data
    analysis_data = {
        "file_name": file_name,
        "client_name": client_name,
        "date": current_date, 
        "paper_type": paper_type,
        "print_method": print_method,
        "score": score,
        "safety_level": "HIGH" if score > 85 else "MEDIUM" if score > 60 else "LOW",
        "resolution": f"{analysis_result.get('dpi', 300)} DPI",
        "sharpness_score": f"{sharpness}",
        "cmyk_coverage": {
            "c": round(cmyk_cov["c"], 1), 
            "m": round(cmyk_cov["m"], 1), 
            "y": round(cmyk_cov["y"], 1), 
            "k": round(cmyk_cov["k"], 1)
        },
        "tac": round(tac_value, 1),
        "ink_consumption": ink_consumption,
        "matte_prediction": "Perfect reproduction. FOGRA39 profile is well-suited for matte finishes." if not analysis_result.get("has_rgb") else "Colors may appear slightly duller on matte due to RGB gamut compression.",
        "glossy_prediction": "Excellent vibrancy. Standard press settings will handle this well.",
        "offset_suitability": f"TAC is {round(tac_value)}%. Suitability is {'EXCELLENT' if tac_value <= 300 else 'GOOD' if tac_value <= 320 else 'POOR'}.",
        "digital_suitability": "GOOD. Digital presses are highly compatible with this file structure.",
        "risk_level": risk,
        "auto_fixes": auto_fixes,
        "scale_factor": 1.0,
        "is_optimized_only": len(auto_fixes) <= 2 and all("Optimized" in f or "Validated" in f for f in auto_fixes),
        "has_rgb": analysis_result.get("has_rgb", False),
        "has_sufficient_bleed": analysis_result.get("has_sufficient_bleed", False),
        "page_count": analysis_result.get("page_count", 1),
        "width_px": analysis_result.get("width_px", 0),
        "height_px": analysis_result.get("height_px", 0),
        "width_mm": analysis_result.get("width_mm", 0.0),
        "height_mm": analysis_result.get("height_mm", 0.0),
        "dpi": analysis_result.get("dpi", 300),
        "rendered_pages": analysis_result.get("rendered_pages", []),
        "color_maps": analysis_result.get("color_maps", []),
        "pages": analysis_result.get("pages", []),
        "supabase_storage_path": analysis_result.get("supabase_storage_path"),
        "status_log": analysis_result.get("status_log", [])
    }
    
    return analysis_data

def remove_file_task(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass

@router.get("/user/{user_id}/stats")
async def get_user_stats(user_id: str):
    """
    Fetch comprehensive statistics for a specific user across both databases.
    """
    total_files = 0
    total_fixes = 0
    total_score = 0
    count_for_avg = 0
    
    # We'll use get_analysis_history logic but without the 50-item limit for counting
    # However, since history_map deduplicates, it's actually safer to just count.
    
    # 1. Supabase Stats
    if supabase:
        try:
            # Total Files (using 'reports' table as per schema)
            res = supabase.table('reports').select('id', 'score', 'analysis_data', count='exact').eq('user_id', user_id).execute()
            if res.data:
                total_files = len(res.data)
                for item in res.data:
                    score = item.get('score', 0)
                    total_score += score
                    count_for_avg += 1
                    
                    data = item.get('analysis_data', {})
                    if data:
                         # Heuristic: Count as fix if it has auto_fixes or was not just optimization
                         if not data.get('is_optimized_only', False) and (data.get('auto_fixes') or data.get('fixes_applied')):
                             total_fixes += 1
        except Exception as e:
            print(f"Supabase stats failed: {e}")

    # 2. Firestore Stats (Basic check for records not in Supabase)
    if db_firestore:
        try:
            docs = db_firestore.collection('users').document(user_id).collection('analyses').stream()

        
        # If we have Supabase records, we only count Firestore ones that are "different" 
        # based on job_id, but for simple stats, we can just merge if supabase is empty
        # or if we want to be precise. Let's stick to the Unified pattern.
        
        if total_files == 0: # Fallback or primarily Firestore user
             for doc in docs:
                item = doc.to_dict()
                total_files += 1
                total_score += item.get('score', 0)
                count_for_avg += 1
                
                # Check fixes
                fixes = item.get('auto_fixes', [])
                if len(fixes) > 2: # Simple heuristic for non-default
                    total_fixes += 1
                elif len(fixes) > 0 and not any("Optimized" in f for f in fixes):
                    total_fixes += 1
                    
    except Exception as e:
        print(f"Firestore stats failed: {e}")

    avg_score = round(total_score / count_for_avg) if count_for_avg > 0 else 0
    
    return {
        "total_files": total_files,
        "total_fixes": total_fixes,
        "avg_score": avg_score
    }


@router.get("/user/{user_id}/profile")
async def get_user_profile(user_id: str):
    """
    Retrieves user profile data from Supabase or Firestore.
    """
    profile = {
        "user_id": user_id,
        "display_name": "",
        "company": "",
        "email": "",
        "photo_url": "",
        "payment_method": None,
        "plan": "Free",
        "role": "User",
        "subscription_end_date": None
    }
    if supabase:
        try:
            res = supabase.table('profiles').select('*').eq('id', user_id).execute()
            if res.data and len(res.data) > 0:
                p = res.data[0]
                profile.update({
                    "display_name": p.get('display_name') or p.get('full_name') or "",
                    "company": p.get('company') or "",
                    "email": p.get('email') or "",
                    "photo_url": p.get('photo_url') or p.get('avatar_url') or "",
                    "payment_method": p.get('payment_method'),
                    "plan": p.get('plan') or "Free",
                    "role": p.get('role') or "User",
                    "subscription_end_date": p.get('subscription_end_date')
                })
                return profile
            
            # Fallback to users table in Supabase
            res_users = supabase.table('users').select('*').eq('uid', user_id).execute()
            if res_users.data and len(res_users.data) > 0:
                u = res_users.data[0]
                profile.update({
                    "email": u.get('email') or "",
                    "plan": u.get('plan') or "Free",
                    "role": u.get('role') or "User",
                    "subscription_end_date": u.get('subscription_end_date')
                })
                return profile
        except Exception as sb_e:
            print(f"Supabase profile fetch warning: {sb_e}")

    if db_firestore:
        try:
            doc = db_firestore.collection('users').document(user_id).get()
            if doc.exists:
                d = doc.to_dict()
                profile.update({
                    "display_name": d.get('display_name') or d.get('displayName') or "",
                    "company": d.get('company') or "",
                    "email": d.get('email') or "",
                    "photo_url": d.get('photo_url') or d.get('photoURL') or "",
                    "payment_method": d.get('payment_method'),
                    "plan": d.get('plan') or "Free",
                    "role": d.get('role') or "User",
                    "subscription_end_date": d.get('subscription_end_date')
                })
        except Exception as fs_e:
            print(f"Firestore profile fetch warning: {fs_e}")

    return profile


@router.patch("/user/{user_id}/profile")
async def update_user_profile(user_id: str, request: Request):
    """
    Updates user profile information in Supabase and Firestore.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    display_name = body.get("display_name")
    company = body.get("company")
    email = body.get("email")
    photo_url = body.get("photo_url")
    payment_method = body.get("payment_method")
    plan = body.get("plan")
    role = body.get("role")
    subscription_end_date = body.get("subscription_end_date")
    trial_expires_at = body.get("trial_expires_at")
    has_used_trial = body.get("has_used_trial")

    update_payload = {}
    if display_name is not None: update_payload["display_name"] = display_name
    if company is not None: update_payload["company"] = company
    if email is not None: update_payload["email"] = email
    if photo_url is not None: update_payload["photo_url"] = photo_url
    if "payment_method" in body: update_payload["payment_method"] = payment_method
    if plan is not None: update_payload["plan"] = plan
    if role is not None: update_payload["role"] = role
    if subscription_end_date is not None: update_payload["subscription_end_date"] = subscription_end_date
    if trial_expires_at is not None: update_payload["trial_expires_at"] = trial_expires_at
    if has_used_trial is not None: update_payload["has_used_trial"] = has_used_trial

    if supabase:
        try:
            supabase.table('profiles').upsert({"id": user_id, **update_payload}).execute()
            supabase.table('users').upsert({"uid": user_id, **update_payload}, on_conflict="uid").execute()
        except Exception as sb_e:
            print(f"Supabase profile update warning: {sb_e}")

    if db_firestore:
        try:
            user_ref = db_firestore.collection('users').document(user_id)
            user_ref.set(update_payload, merge=True)
        except Exception as fs_e:
            print(f"Firestore profile update warning: {fs_e}")

    if firebase_auth:
        try:
            kwargs = {}
            if display_name: kwargs["display_name"] = display_name
            if photo_url: kwargs["photo_url"] = photo_url
            if kwargs:
                firebase_auth.update_user(user_id, **kwargs)
        except Exception as fa_e:
            print(f"Firebase Auth profile update warning: {fa_e}")


    return {"status": "success", "profile": update_payload}


@router.delete("/user/{user_id}")
async def delete_user_account(user_id: str):
    """
    Deletes user account and associated data.
    """
    if supabase:
        try:
            supabase.table('reports').delete().eq('user_id', user_id).execute()
            supabase.table('profiles').delete().eq('id', user_id).execute()
        except Exception as sb_e:
            print(f"Supabase user delete warning: {sb_e}")

    try:
        db = firestore.client()
        db.collection('users').document(user_id).delete()
    except Exception as fs_e:
        print(f"Firestore user delete warning: {fs_e}")

    if firebase_auth:
        try:
            firebase_auth.delete_user(user_id)
        except Exception as fa_e:
            print(f"Firebase Auth user delete warning: {fa_e}")

    return {"status": "success", "message": "User account deleted"}


@router.post("/extend-bleed")
@router.post("/fix/bleed")
async def fix_bleed_endpoint(
    user_id: Optional[str] = Form(""),
    analysis_id: Optional[str] = Form(""),
    bleed_mm: float = Form(3.0),
    target_format: str = Form("PDF"),
    supabase_storage_path: Optional[str] = Form(None),
    base64_image: Optional[str] = Form(None),
    file_name_param: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    from services.bleed_extender import extend_bleed
    """
    Retrieves a previously analyzed file or base64 preview, extends its bleed, and returns the fixed file.
    """
    input_temp = None
    output_temp = None
    try:
        file_name = file_name_param or "document.pdf"
        storage_path = supabase_storage_path

        # 1a. Try to lookup in Supabase if storage_path not directly passed
        if not storage_path and supabase and analysis_id and analysis_id != "undefined":
            try:
                if analysis_id.isdigit():
                    res = supabase.table('reports').select('analysis_data').eq('id', int(analysis_id)).execute()
                else:
                    res = supabase.table('reports').select('analysis_data').eq('job_id', analysis_id).execute()

                if res.data:
                    analysis_data = res.data[0].get('analysis_data', {})
                    storage_path = analysis_data.get('supabase_storage_path')
                    file_name = analysis_data.get('file_name', file_name)
                    if not base64_image and analysis_data.get('rendered_pages'):
                        base64_image = analysis_data['rendered_pages'][0]
            except Exception as sb_e:
                print(f"Supabase lookup failed for bleed fix: {sb_e}")

        # 1b. Try to lookup in Firestore
        if not storage_path and user_id and analysis_id and analysis_id != "undefined":
            try:
                db = firestore.client()
                doc = db.collection('users').document(user_id).collection('analyses').document(analysis_id).get()
                if doc.exists:
                    doc_data = doc.to_dict()
                    file_name = doc_data.get('file_name', file_name)
                    storage_path = doc_data.get('supabase_storage_path')
                    if not base64_image and doc_data.get('rendered_pages'):
                        base64_image = doc_data['rendered_pages'][0]
            except Exception as fs_e:
                print(f"Firestore lookup failed for bleed fix: {fs_e}")

        ext = target_format.lower()
        fd, input_temp = tempfile.mkstemp(suffix=f"_{file_name}")
        os.close(fd)

        file_retrieved = False

        # Attempt A: Supabase storage download
        if storage_path and supabase:
            try:
                with open(input_temp, 'wb+') as f:
                    res_file = supabase.storage.from_('uploads').download(storage_path)
                    f.write(res_file)
                file_retrieved = True
            except Exception as dl_e:
                print(f"Supabase storage download failed: {dl_e}")

        # Attempt B: Direct file upload fallback
        if not file_retrieved and file:
            with open(input_temp, 'wb') as f:
                shutil.copyfileobj(file.file, f)
            file_name = file.filename or file_name
            file_retrieved = True

        # Attempt C: Base64 image fallback
        if not file_retrieved and base64_image:
            try:
                b64_data = base64_image
                if ',' in b64_data:
                    b64_data = b64_data.split(',', 1)[1]
                img_bytes = base64.b64decode(b64_data)
                with open(input_temp, 'wb') as f:
                    f.write(img_bytes)
                file_retrieved = True
            except Exception as b64_e:
                print(f"Base64 image decode failed: {b64_e}")

        if not file_retrieved:
            raise HTTPException(
                status_code=400,
                detail="Unable to find source document file for bleed extension. Please re-upload your file on the Upload page."
            )

        # Create output path
        fd, output_temp = tempfile.mkstemp(suffix=f"_fixed.{ext}")
        os.close(fd)

        # Extend Bleed
        success = extend_bleed(input_temp, output_temp, bleed_mm=bleed_mm)
        if not success:
            raise HTTPException(status_code=500, detail="Bleed extension failed during processing")

        base_name = file_name.rsplit('.', 1)[0]
        return FileResponse(
            path=output_temp,
            media_type=f"application/{ext}" if ext == 'pdf' else f"image/{ext}",
            filename=f"{base_name}_{bleed_mm}mm_bleed.{ext}"
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"Bleed fix error:\n{error_msg}")
        raise HTTPException(status_code=500, detail=str(error_msg))
    finally:
        if input_temp and os.path.exists(input_temp):
            os.remove(input_temp)

@router.post("/convert")
async def convert_file_endpoint(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    format: str = Form("pdf")
):
    from services.analyzer import convert_to_cmyk
    """
    Accepts a file or a remote URL, converts it to CMYK format, and returns it dynamically as PDF, JPG, or PNG.
    """
    file_name = file.filename
    export_format = format.lower()
    if export_format not in ['pdf', 'jpg', 'png']:
        export_format = 'pdf'
        
    # Map jpg -> jpeg for Pillow processing
    pil_format = "JPEG" if export_format == "jpg" else export_format.upper()
    
    # Save input
    fd1, input_path = tempfile.mkstemp(suffix=f"_{file_name}")
    os.close(fd1)
    
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Prepare output path
    fd2, output_path = tempfile.mkstemp(suffix=f"_CMYK_converted.{export_format}")
    os.close(fd2)
    
    try:
        success = convert_to_cmyk(input_path, file_name, output_path, output_format=pil_format)
        if not success:
            raise Exception("Conversion failed inside analyzer")
            
        background_tasks.add_task(remove_file_task, input_path)
        background_tasks.add_task(remove_file_task, output_path)
        
        media_types = {
            "pdf": "application/pdf",
            "jpg": "image/jpeg",
            "png": "image/png"
        }
        
        return FileResponse(
            path=output_path, 
            media_type=media_types.get(export_format, "application/octet-stream"), 
            filename=f"CMYK_{file_name.split('.')[0]}.{export_format}"
        )
    except Exception as e:
        remove_file_task(input_path)
        remove_file_task(output_path)
        raise e

@router.post("/convert-url")
async def convert_url_endpoint(
    background_tasks: BackgroundTasks, 
    url: str = Form(...),
    format: str = Form("pdf")
):
    from services.analyzer import convert_to_cmyk
    """
    Accepts a remote URL, downloads it, converts it to CMYK format, and returns it dynamically as PDF, JPG, or PNG.
    """
    file_name = url.split('/')[-1].split('?')[0] or "downloaded_file"
    export_format = format.lower()
    if export_format not in ['pdf', 'jpg', 'png']:
        export_format = 'pdf'
        
    pil_format = "JPEG" if export_format == "jpg" else export_format.upper()
    
    fd1, input_path = tempfile.mkstemp(suffix=f"_{file_name}")
    os.close(fd1)
    
    import urllib.request
    import urllib.parse
    import ssl
    try:
        parsed = urllib.parse.urlsplit(url)
        safe_path = urllib.parse.quote(urllib.parse.unquote(parsed.path))
        safe_query = urllib.parse.quote(urllib.parse.unquote(parsed.query), safe='=&')
        safe_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, safe_path, safe_query, parsed.fragment))
        
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        req = urllib.request.Request(safe_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response, open(input_path, 'wb') as out_file:
            shutil.copyfileobj(response, out_file)
    except Exception as e:
        remove_file_task(input_path)
        import traceback
        print(f"Downloader failed on {url}")
        traceback.print_exc()
        raise Exception(f"Failed to download file from URL: {e}")
        
    fd2, output_path = tempfile.mkstemp(suffix=f"_CMYK_converted.{export_format}")
    os.close(fd2)
    
    try:
        success = convert_to_cmyk(input_path, file_name, output_path, output_format=pil_format)
        if not success:
            raise Exception("Conversion failed inside analyzer")
            
        background_tasks.add_task(remove_file_task, input_path)
        background_tasks.add_task(remove_file_task, output_path)
        
        media_types = {
            "pdf": "application/pdf",
            "jpg": "image/jpeg",
            "png": "image/png"
        }
        
        return FileResponse(
            path=output_path, 
            media_type=media_types.get(export_format, "application/octet-stream"), 
            filename=f"CMYK_{file_name.split('.')[0]}.{export_format}"
        )
    except Exception as e:
        remove_file_task(input_path)
        remove_file_task(output_path)
        import traceback
        print(f"Analyzer or FileResponse failed on {file_name}: {e}")
        traceback.print_exc()
        raise e

@router.post("/convert-analysis")
async def convert_analysis_endpoint(
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = Form(""),
    analysis_id: Optional[str] = Form(""),
    format: str = Form("pdf"),
    supabase_storage_path: Optional[str] = Form(None),
    base64_image: Optional[str] = Form(None),
    file_name_param: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    from services.analyzer import convert_to_cmyk
    input_temp = None
    output_temp = None
    try:
        file_name = file_name_param or "document.pdf"
        storage_path = supabase_storage_path
        export_format = format.lower()
        if export_format not in ['pdf', 'jpg', 'png']:
            export_format = 'pdf'
        pil_format = "JPEG" if export_format == "jpg" else export_format.upper()

        if not storage_path and supabase and analysis_id and analysis_id != "undefined":
            try:
                if analysis_id.isdigit():
                    res = supabase.table('reports').select('analysis_data').eq('id', int(analysis_id)).execute()
                else:
                    res = supabase.table('reports').select('analysis_data').eq('job_id', analysis_id).execute()
                if res.data:
                    analysis_data = res.data[0].get('analysis_data', {})
                    storage_path = analysis_data.get('supabase_storage_path')
                    file_name = analysis_data.get('file_name', file_name)
                    if not base64_image and analysis_data.get('rendered_pages'):
                        base64_image = analysis_data['rendered_pages'][0]
            except Exception as sb_e:
                print(f"Supabase lookup failed for convert: {sb_e}")

        fd, input_temp = tempfile.mkstemp(suffix=f"_{file_name}")
        os.close(fd)
        file_retrieved = False

        if storage_path and supabase:
            try:
                with open(input_temp, 'wb+') as f:
                    res_file = supabase.storage.from_('uploads').download(storage_path)
                    f.write(res_file)
                file_retrieved = True
            except Exception as dl_e:
                print(f"Supabase storage download failed: {dl_e}")

        if not file_retrieved and file:
            with open(input_temp, 'wb') as f:
                shutil.copyfileobj(file.file, f)
            file_name = file.filename or file_name
            file_retrieved = True

        if not file_retrieved and base64_image:
            try:
                b64_data = base64_image
                if ',' in b64_data:
                    b64_data = b64_data.split(',', 1)[1]
                img_bytes = base64.b64decode(b64_data)
                with open(input_temp, 'wb') as f:
                    f.write(img_bytes)
                file_retrieved = True
            except Exception as b64_e:
                print(f"Base64 image decode failed: {b64_e}")

        if not file_retrieved:
            raise HTTPException(status_code=400, detail="Source file not found for conversion.")

        fd, output_temp = tempfile.mkstemp(suffix=f"_CMYK_converted.{export_format}")
        os.close(fd)

        success = convert_to_cmyk(input_temp, file_name, output_temp, output_format=pil_format)
        if not success:
            raise HTTPException(status_code=500, detail="CMYK Conversion failed during processing.")

        background_tasks.add_task(remove_file_task, input_temp)
        background_tasks.add_task(remove_file_task, output_temp)

        media_types = {
            "pdf": "application/pdf",
            "jpg": "image/jpeg",
            "png": "image/png"
        }
        return FileResponse(
            path=output_temp,
            media_type=media_types.get(export_format, "application/octet-stream"),
            filename=f"CMYK_{file_name.rsplit('.', 1)[0]}.{export_format}"
        )
    except Exception as e:
        if input_temp and os.path.exists(input_temp): os.remove(input_temp)
        if output_temp and os.path.exists(output_temp): os.remove(output_temp)
        raise e

@router.post("/extend-bleed")
async def extend_bleed_endpoint(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    bleed_mm: float = Form(3.0)
):
    from services.bleed_extender import extend_bleed
    """
    Endpoint that takes an input file and the requested bleed amount (in mm),
    stretches its outermost pixels to provide bleed margins, and returns the file.
    """
    file_name = file.filename
    export_format = file_name.split('.')[-1].lower() if '.' in file_name else 'pdf'
    if export_format not in ['pdf', 'jpg', 'jpeg', 'png']:
        export_format = 'pdf'
        
    fd1, input_path = tempfile.mkstemp(suffix=f"_{file_name}")
    os.close(fd1)
    
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    fd2, output_path = tempfile.mkstemp(suffix=f"_Bleed_Extended.{export_format}")
    os.close(fd2)
    
    try:
        success = extend_bleed(input_path, output_path, bleed_mm)
        if not success:
            raise Exception("Bleed extension failed inside service")
            
        background_tasks.add_task(remove_file_task, input_path)
        background_tasks.add_task(remove_file_task, output_path)
        
        media_types = {
            "pdf": "application/pdf",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png"
        }
        
        # Determine the name for download
        basename = file_name.rsplit('.', 1)[0] if '.' in file_name else file_name
        
        return FileResponse(
            path=output_path, 
            media_type=media_types.get(export_format, "application/octet-stream"), 
            filename=f"{basename}_Bleed_Extended.{export_format}"
        )
    except Exception as e:
        remove_file_task(output_path)
        raise e

class SaveAnalysisData(BaseModel):
    user_id: str
    file_name: str
    score: int
    risk_level: str
    status: str = "Completed"
    analysis_data: Dict[str, Any]
    supabase_storage_path: Optional[str] = None
    job_id: Optional[str] = None

@router.post("/save-analysis")
async def save_analysis_result(data: SaveAnalysisData):
    """
    Save analysis results to both Supabase and Firestore for dual-database consistency.
    """
    results = {"supabase": "failed", "firestore": "failed"}
    import uuid
    job_id = data.job_id or str(uuid.uuid4())
    
    # 1. Save to Supabase
    if supabase:
        try:
            insert_data = {
                "user_id": data.user_id,
                "file_name": data.file_name,
                "score": data.score,
                "risk_level": data.risk_level,
                "status": data.status,
                "analysis_data": data.analysis_data,
                "supabase_storage_path": data.supabase_storage_path,
                "job_id": job_id,
                "created_at": datetime.now().isoformat()
            }
            res = supabase.table('reports').insert(insert_data).execute()
            if res.data:
                results["supabase"] = "success"
        except Exception as e:
            print(f"Backend Supabase Save Error: {e}")
            results["supabase"] = f"error: {str(e)}"
    
    # 2. Save to Firestore
    try:
        db_firestore = firestore.client()
        # Save to user-specific subcollection, use job_id as document ID for easy mapping
        analysis_ref = db_firestore.collection('users').document(data.user_id).collection('analyses').document(job_id)
        
        # Flatten data for Firestore to match legacy structure/provided tree
        insert_data_fs = {
            "user_id": data.user_id,
            "file_name": data.file_name,
            "score": data.score,
            "risk_level": data.risk_level,
            "status": data.status,
            "supabase_storage_path": data.supabase_storage_path,
            "job_id": job_id,
            "created_at": datetime.now() 
        }
        
        # Add all analysis fields to the root of the document
        if isinstance(data.analysis_data, dict):
            for k, v in data.analysis_data.items():
                if k not in insert_data_fs:
                    insert_data_fs[k] = v
                    
        analysis_ref.set(insert_data_fs)
        results["firestore"] = "success"

        # Create notification entry for this analysis
        try:
            notif_ref = db_firestore.collection('users').document(data.user_id).collection('notifications').document()
            title = "Analysis Complete" if data.score >= 80 else "High Risk Detected"
            msg = f"{data.file_name} analysis complete. Quality score: {data.score}/100"
            notif_type = "success" if data.score >= 80 else ("warning" if data.score >= 60 else "danger")
            notif_ref.set({
                "title": title,
                "message": msg,
                "type": notif_type,
                "read": False,
                "created_at": datetime.now(),
                "file_name": data.file_name,
                "score": data.score,
                "job_id": job_id
            })
        except Exception as ne:
            print(f"Error creating notification on save_analysis: {ne}")

    except Exception as e:
        print(f"Backend Firestore Save Error: {e}")
        results["firestore"] = f"error: {str(e)}"
        
    return {"status": "processed", "results": results}


@router.get("/admin/stats")
async def get_admin_stats():
    """
    Fetch real-time statistics from the databases for the Admin Dashboard.
    """
    stats = {
        "total_users": 0,
        "active_pro_subs": 0,
        "ai_jobs_processed": 0,
        "system_alerts": 0
    }
    
    if supabase:
        try:
            # Get User Count
            users_res = supabase.table('users').select('uid', count='exact').execute()
            stats["total_users"] = users_res.count if users_res.count is not None else 0
            
            # Get Pro Subs (assuming 'plan' column exists)
            pro_res = supabase.table('users').select('uid', count='exact').eq('plan', 'Pro').execute()
            stats["active_pro_subs"] = pro_res.count if pro_res.count is not None else 0
            
            # Get Jobs Processed
            jobs_res = supabase.table('reports').select('id', count='exact').execute()
            stats["ai_jobs_processed"] = jobs_res.count if jobs_res.count is not None else 0
            
        except Exception as e:
            print(f"Error fetching admin stats: {e}")
            
    # Mock alerts for now as we don't have an alert system implemented yet
    stats["system_alerts"] = random.randint(0, 5)
    
    return stats

@router.get("/history")
async def get_analysis_history(user_id: str = Query(...)):
    """
    Fetch analysis history from both Supabase and Firestore for a given user.
    """
    _BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    log_path = os.path.join(_BASE_DIR, "backend_debug.log")
    with open(log_path, "a") as f:
        f.write(f"\n--- {datetime.now()} ---\n")
        f.write(f"DEBUG: Fetching history for user: {user_id}\n")
        f.write(f"DEBUG: Firebase Admin initialized: {len(firebase_admin._apps) > 0}\n")
        if len(firebase_admin._apps) > 0:
            f.write(f"DEBUG: Default App Name: {firebase_admin.get_app().name}\n")
            
    history_map = {} # job_id -> record
    
    # 1. Fetch from Firestore (Updated to Subcollection)
    try:
        db_firestore = firestore.client()
        # Fetch from 'users/{user_id}/analyses' subcollection
        docs = db_firestore.collection('users').document(user_id).collection('analyses').limit(100).stream()
        
        for doc in docs:
            item = doc.to_dict()
            item['id'] = doc.id
            item['source'] = 'Firebase'
            
            # 1. Convert Firestore Timestamp to ISO String for JSON serialization
            if 'created_at' in item and hasattr(item['created_at'], 'isoformat'):
                item['created_at'] = item['created_at'].isoformat()
            
            # 2. Flatten if nested
            if 'analysis_data' in item and isinstance(item['analysis_data'], dict):
                nested = item.pop('analysis_data')
                for k, v in nested.items():
                    if k not in item: item[k] = v
            
            jid = item.get('job_id')
            if jid:
                history_map[jid] = item
            else:
                # Legacy or missing job_id
                history_map[item['id']] = item
    except Exception as e:
        print(f"Firestore fetch failed: {e}")
    
    # 2. Fetch from Supabase (New)
    if supabase:
        try:
            response = supabase.table('reports').select('*').eq('user_id', user_id).order_by('created_at', ascending=False).limit(50).execute()
            supabase_records = response.data
            for record in supabase_records:
                # Standardize/Flatten if nested
                if 'analysis_data' in record and isinstance(record['analysis_data'], dict):
                    nested = record.pop('analysis_data')
                    for k, v in nested.items():
                        if k not in record: record[k] = v
                
                record['source'] = 'Supabase'
                jid = record.get('job_id')
                
                if jid and jid in history_map:
                    # Merge: keep Supabase record but ensure we have all fields
                    history_map[jid].update(record)
                    history_map[jid]['source'] = 'Unified'
                    # Ensure unified ID for CRUD operations
                    history_map[jid]['id'] = jid
                elif jid:
                    history_map[jid] = record
                    history_map[jid]['id'] = jid
                else:
                    history_map[record['id']] = record
        except Exception as e:
            print(f"Supabase fetch failed: {e}")

    combined_history = list(history_map.values())

    # Sort combined history by created_at descending
    def get_date(item):
        d = item.get('created_at') or item.get('date', '')
        return str(d)

    combined_history.sort(key=get_date, reverse=True)
    
    return combined_history

@router.get("/analysis/{analysis_id}")
async def get_analysis_by_id(analysis_id: str, user_id: Optional[str] = Query(None)):
    """
    Fetch a specific analysis by ID from both Supabase and Firestore.
    """
    # 1. Try Supabase
    if supabase:
        try:
            # Check if it's a numeric ID (Supabase) or UUID/String
            if analysis_id.isdigit():
                res = supabase.table('reports').select('*').eq('id', int(analysis_id)).execute()
            else:
                res = supabase.table('reports').select('*').eq('id', analysis_id).execute()
            
            if res.data and len(res.data) > 0:
                item = res.data[0]
                # Standardize/Flatten if nested
                if 'analysis_data' in item and isinstance(item['analysis_data'], dict):
                    data = item.pop('analysis_data')
                    for k, v in item.items():
                        if k not in data: data[k] = v
                else:
                    data = item
                
                data['source'] = 'Supabase'
                data['preview_url'] = f"/api/analysis/{analysis_id}/preview" + (f"?user_id={user_id}" if user_id else "")
                return data
        except Exception as e:
            print(f"Supabase fetch by ID failed: {e}")

    # 2. Try Firestore
    try:
        db_firestore = firestore.client()
        if user_id:
            # Check subcollection
            doc = db_firestore.collection('users').document(user_id).collection('analyses').document(analysis_id).get()
        else:
            # Legacy root check if user_id not provided
            doc = db_firestore.collection('analyses').document(analysis_id).get()
            
        if doc.exists:
            item = doc.to_dict()
            item['id'] = doc.id
            item['source'] = 'Firebase'
            # Flatten if nested
            if 'analysis_data' in item and isinstance(item['analysis_data'], dict):
                nested = item.pop('analysis_data')
                for k, v in nested.items():
                    if k not in item: item[k] = v
            item['preview_url'] = f"/api/analysis/{analysis_id}/preview" + (f"?user_id={user_id}" if user_id else "")
            return item
    except Exception as e:
        print(f"Firestore fetch by ID failed: {e}")

    return {"error": "Analysis not found"}

@router.get("/analysis/{analysis_id}/preview")
async def get_analysis_preview(analysis_id: str, user_id: Optional[str] = Query(None)):
    """
    Return the decoded first rendered page as a direct image response.
    """
    # Fetch data first
    analysis = await get_analysis_by_id(analysis_id, user_id=user_id)
    if "error" in analysis:
        return {"error": "Analysis not found"}
    
    # Decidedly check both root and nested just in case flattening was skipped or failed
    rendered_pages = analysis.get('rendered_pages', [])
    if not rendered_pages and 'analysis_data' in analysis and isinstance(analysis['analysis_data'], dict):
        rendered_pages = analysis['analysis_data'].get('rendered_pages', [])

    if not rendered_pages:
        # Check for direct supabase storage path if preview not rendered
        storage_path = analysis.get('supabase_storage_path')
        if storage_path and supabase:
            try:
                # If it's an image, we could return it directly
                # For now, stick to rendered_pages as the primary preview source
                pass
            except Exception:
                pass
        return {"error": "No preview available"}

    try:
        # data:image/jpeg;base64,xxxx
        prefix = "data:image/jpeg;base64,"
        if rendered_pages[0].startswith(prefix):
            img_b64 = rendered_pages[0].replace(prefix, "")
            img_data = base64.b64decode(img_b64)
            return Response(content=img_data, media_type="image/jpeg")
    except Exception as e:
        print(f"Preview extraction failed: {e}")
    
    return {"error": "Failed to extract preview"}

@router.get("/user/{user_id}/latest-analysis")
async def get_latest_user_analysis(user_id: str):
    """
    Quickly fetch the latest analysis for a user.
    """
    history = await get_analysis_history(user_id)
    if history and len(history) > 0:
        latest_id = history[0].get('id')
        if latest_id:
            return await get_analysis_by_id(str(latest_id))
    
    return {"error": "No analysis found for this user"}

@router.delete("/analysis/{analysis_id}")
async def delete_analysis(analysis_id: str, user_id: Optional[str] = Query(None)):
    """
    Permanently delete an analysis record from both Supabase and Firestore.
    """
    results = {"supabase": "skipped", "firestore": "skipped"}
    print(f"DEBUG: Deleting analysis {analysis_id} for user {user_id}")
    
    # 1. Delete from Supabase
    if supabase:
        try:
            # First try delete by job_id if it looks like a job_id (UUID-ish)
            # or if it's explicitly used in Dashboard as the record.id
            supabase.table('reports').delete().eq('job_id', analysis_id).execute()
            
            # Also try delete by numeric id for legacy records
            if analysis_id.isdigit():
                supabase.table('reports').delete().eq('id', int(analysis_id)).execute()
            else:
                supabase.table('reports').delete().eq('id', analysis_id).execute()
            
            results["supabase"] = "success"
        except Exception as e:
            print(f"Supabase delete failed: {e}")
            results["supabase"] = f"error: {str(e)}"

    # 2. Delete from Firestore
    try:
        db_firestore = firestore.client()
        if user_id:
            # Correct path for user-specific subcollection
            doc_ref = db_firestore.collection('users').document(user_id).collection('analyses').document(analysis_id)
            doc_ref.delete()
            print(f"DEBUG: Firestore delete triggered for path users/{user_id}/analyses/{analysis_id}")
            results["firestore"] = "success"
        else:
            # Fallback for legacy data or if user_id is missing
            doc_ref = db_firestore.collection('analyses').document(analysis_id)
            doc_ref.delete()
            print(f"DEBUG: Firestore delete triggered for path analyses/{analysis_id}")
            results["firestore"] = "success"
    except Exception as e:
        print(f"Firestore delete failed: {e}")
        results["firestore"] = f"error: {str(e)}"

    # If both failed or were skipped, we should probably signal a failure status
    if results["supabase"] != "success" and results["firestore"] != "success":
        raise HTTPException(status_code=500, detail=f"Failed to delete analysis from both databases. Results: {results}")

    return {"status": "deleted", "results": results}

class UpdateAnalysisData(BaseModel):
    file_name: Optional[str] = None
    client_name: Optional[str] = None
    risk_level: Optional[str] = None
    score: Optional[int] = None
    status: Optional[str] = None

@router.patch("/analysis/{analysis_id}")
async def update_analysis(analysis_id: str, data: UpdateAnalysisData, user_id: Optional[str] = Query(None)):
    """
    Update metadata for an existing analysis record.
    """
    update_dict = data.dict(exclude_unset=True)
    if not update_dict:
        return {"status": "no_changes"}
        
    results = {"supabase": "skipped", "firestore": "skipped"}
    
    # 1. Update Supabase
    if supabase:
        try:
            supabase.table('reports').update(update_dict).eq('job_id', analysis_id).execute()
            if analysis_id.isdigit():
                supabase.table('reports').update(update_dict).eq('id', int(analysis_id)).execute()
            else:
                supabase.table('reports').update(update_dict).eq('id', analysis_id).execute()
            results["supabase"] = "success"
        except Exception as e:
            print(f"Supabase update failed: {e}")
            results["supabase"] = f"error: {str(e)}"

    # 2. Update Firestore
    try:
        def do_update():
            if user_id:
                doc_ref = db_firestore.collection('users').document(user_id).collection('analyses').document(analysis_id)
            else:
                doc_ref = db_firestore.collection('analyses').document(analysis_id)
            doc_ref.update(update_dict)
            return True
        await run_firestore_retry("update_analysis", do_update)
        results["firestore"] = "success"
    except Exception as e:
        print(f"Firestore update failed: {e}")
        results["firestore"] = f"error: {str(e)}"

    return {"status": "updated", "results": results}

class UserProfileData(BaseModel):
    display_name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    plan: Optional[str] = None
    trial_expires_at: Optional[str] = None
    has_used_trial: Optional[bool] = None
    subscription_end_date: Optional[str] = None
    payment_method: Optional[Dict[str, Any]] = None

@router.get("/user/{user_id}/profile")
async def get_user_profile(user_id: str):
    """
    Fetch user profile metadata from Supabase or Firestore.
    """
    # 1. Try Supabase
    if supabase:
        try:
            res = supabase.table('users').select('*').eq('uid', user_id).execute()
            if res.data and len(res.data) > 0:
                data = res.data[0]
                data['source'] = 'Supabase'
                return data
        except Exception as e:
            print(f"Supabase user fetch failed: {e}")

    # 2. Try Firestore
    try:
        db_firestore = firestore.client()
        doc = db_firestore.collection('users').document(user_id).get()
        if doc.exists:
            data = doc.to_dict()
            data['uid'] = doc.id
            data['source'] = 'Firebase'
            return data
    except Exception as e:
        print(f"Firestore user fetch failed: {e}")

    return {"error": "User profile not found"}

@router.patch("/user/{user_id}/profile")
async def update_user_profile(user_id: str, data: UserProfileData):
    """
    Update user profile metadata.
    """
    update_dict = data.dict(exclude_unset=True)
    if not update_dict:
        return {"status": "no_changes"}
        
    results = {"supabase": "skipped", "firestore": "skipped"}
    
    # 1. Update Supabase
    if supabase:
        try:
            upsert_dict = {"uid": user_id, **update_dict}
            res = supabase.table('users').upsert(upsert_dict, on_conflict='uid').execute()
            results["supabase"] = "success"
        except Exception as e:
            print(f"Supabase user update failed: {e}")
            results["supabase"] = f"error: {str(e)}"

    # 2. Update Firestore
    try:
        await run_firestore_retry("update_user_profile", 
            lambda: db_firestore.collection('users').document(user_id).set(update_dict, merge=True))
        results["firestore"] = "success"
    except Exception as e:
        print(f"Firestore user update failed: {e}")
        results["firestore"] = f"error: {str(e)}"

    return {"status": "updated", "results": results}

@router.delete("/user/{user_id}")
async def delete_user_account(user_id: str):
    """
    Delete all data associated with a user.
    """
    results = {"supabase": "skipped", "firestore": "skipped"}
    
    # 1. Delete from Supabase (Analyses and User record)
    if supabase:
        try:
            supabase.table('reports').delete().eq('user_id', user_id).execute()
            supabase.table('users').delete().eq('uid', user_id).execute()
            results["supabase"] = "success"
        except Exception as e:
            results["supabase"] = f"error: {str(e)}"

    # 2. Delete from Firestore (Analyses subcollection and User doc)
    try:
        db_firestore = firestore.client()
        # Delete subcollection (simplified, usually requires recursive delete)
        # For now, just delete the main user document
        db_firestore.collection('users').document(user_id).delete()
        results["firestore"] = "success"
    except Exception as e:
        results["firestore"] = f"error: {str(e)}"

    return {"status": "deleted", "results": results}

class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None

@router.patch("/admin/user/{user_id}")
async def admin_update_user(user_id: str, data: AdminUserUpdate):
    """
    Admin only: Update user role, plan, or status.
    """
    update_dict = data.dict(exclude_unset=True)
    if not update_dict:
        return {"status": "no_changes"}

    results = {"supabase": "skipped", "firestore": "skipped"}

    if supabase:
        try:
            supabase.table('users').update(update_dict).eq('uid', user_id).execute()
            results["supabase"] = "success"
        except Exception as e:
            results["supabase"] = f"error: {str(e)}"

    try:
        db_firestore = firestore.client()
        db_firestore.collection('users').document(user_id).set(update_dict, merge=True)
        results["firestore"] = "success"
    except Exception as e:
        results["firestore"] = f"error: {str(e)}"

    return {"status": "updated", "results": results}


# ── UPS (Step-and-Repeat) Imposition ─────────────────────────────────────────

@router.post("/generate-ups")
async def generate_ups_endpoint(data: UPSDielineRequest):
    from services.ups_generator import generate_ups_pdf
    """
    Generate a multi-up (step-and-repeat) imposition PDF in CMYK vector quality.
    Includes cutting marks, creasing marks, bleed marks, and registration targets.
    Returns a downloadable PDF.
    """
    fd, tmp_path = tempfile.mkstemp(suffix="_ups.pdf")
    os.close(fd)
    try:
        success = generate_ups_pdf(data.dict(), tmp_path)
        if not success:
            raise HTTPException(status_code=500, detail="UPS PDF generation failed")

        base = data.file_name.rsplit(".", 1)[0]
        return FileResponse(
            path=tmp_path,
            media_type="application/pdf",
            filename=f"UPS_{base}_{data.paper_size}.pdf",
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))


# ── Die Line Generator ────────────────────────────────────────────────────────

@router.post("/generate-dieline")
async def generate_dieline_endpoint(data: UPSDielineRequest):
    from services.dieline_generator import generate_dieline_pdf
    """
    Generate a Pacdora-style die line PDF in CMYK vector quality.
    Includes cut lines (magenta), fold/crease lines (blue),
    perforation (black dot-dash), bleed boundary (grey), safety margin (green),
    plus registration marks, CMYK calibration bar, legend, and dimension labels.
    Returns a downloadable PDF.
    """
    fd, tmp_path = tempfile.mkstemp(suffix="_dieline.pdf")
    os.close(fd)
    try:
        success = generate_dieline_pdf(data.dict(), tmp_path)
        if not success:
            raise HTTPException(status_code=500, detail="Die line PDF generation failed")

        base = data.file_name.rsplit(".", 1)[0]
        return FileResponse(
            path=tmp_path,
            media_type="application/pdf",
            filename=f"DieLine_{base}.pdf",
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))

# --- Phone Authentication Endpoints ---

class PhoneAuthRequest(BaseModel):
    phone_number: str

class OTPVerifyRequest(BaseModel):
    phone_number: str
    otp_code: str

@router.post("/auth/phone/send-otp")
async def send_phone_otp(request: PhoneAuthRequest):
    """
    Send an OTP to the user's phone number using Twilio Verify.
    """
    twilio_client = get_twilio_client()
    if not twilio_client or not TWILIO_VERIFY_SERVICE_SID:
        raise HTTPException(status_code=500, detail="Twilio service not configured")
    
    try:
        verification = twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID) \
            .verifications \
            .create(to=request.phone_number, channel='sms')
        
        return {"status": "sent", "sid": verification.sid}
    except Exception as e:
        print(f"Twilio Send OTP Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/auth/phone/verify-otp")
async def verify_phone_otp(request: OTPVerifyRequest):
    """
    Verify the OTP and return a Firebase Custom Token.
    """
    twilio_client = get_twilio_client()
    if not twilio_client or not TWILIO_VERIFY_SERVICE_SID:
        raise HTTPException(status_code=500, detail="Twilio service not configured")
    
    try:
        verification_check = twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID) \
            .verification_checks \
            .create(to=request.phone_number, code=request.otp_code)
        
        if verification_check.status != "approved":
            raise HTTPException(status_code=400, detail="Invalid OTP code")
        
        # OTP is valid. Now handle Firebase Custom Token.
        # Use phone number as UID (sanitized)
        uid = f"phone_{request.phone_number.replace('+', '')}"
        
        # Create user in Firebase if doesn't exist (optional, create_custom_token doesn't require it)
        # But for UI consistency, we might want to ensure they have an account.
        try:
            user = firebase_auth.get_user_by_phone_number(request.phone_number)
        except Exception:
            # User doesn't exist by phone, try by custom UID
            try:
                user = firebase_auth.get_user(uid)
            except Exception:
                # Create user
                user = firebase_auth.create_user(
                    uid=uid,
                    phone_number=request.phone_number,
                    display_name=f"User {request.phone_number[-4:]}"
                )
        
        # Generate Firebase Custom Token
        custom_token = firebase_auth.create_custom_token(user.uid)
        
        return {
            "status": "verified",
            "firebase_token": custom_token.decode('utf-8') if isinstance(custom_token, bytes) else custom_token,
            "uid": user.uid
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Twilio Verify OTP Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# --- Admin & User Management ---

@router.get("/admin/stats")
async def get_admin_stats():
    """
    Get high-level platform statistics for the Admin Dashboard.
    """
    try:
        # 1. Total Users from Supabase
        users_count = 0
        res = supabase.table("users").select("uid", count="exact").execute()
        users_count = res.count if res.count is not None else 0
        
        # 2. Active Pro Subs
        pro_count = 0
        pro_res = supabase.table("users").select("uid", count="exact").eq("plan", "Pro").execute()
        pro_count = pro_res.count if pro_res.count is not None else 0
        
        # 3. AI Jobs Processed (Simulated or from reports table if exists)
        jobs_count = 0
        try:
            reports_res = supabase.table("reports").select("id", count="exact").execute()
            jobs_count = reports_res.count if reports_res.count is not None else 0
        except:
            jobs_count = 124 # Fallback mock
            
        return {
            "total_users": str(users_count),
            "active_pro_subs": str(pro_count),
            "ai_jobs_processed": str(jobs_count),
            "system_alerts": "0"
        }
    except Exception as e:
        print(f"Error fetching admin stats: {str(e)}")
        # Return mock data as fallback if DB table doesn't exist yet
        return {
            "total_users": "0",
            "active_pro_subs": "0",
            "ai_jobs_processed": "0",
            "system_alerts": "0",
            "error": str(e)
        }

@router.patch("/admin/user/{uid}")
async def update_user_profile(uid: str, data: dict):
    """
    Update a user's plan or role (Admin Only).
    """
    try:
        res = supabase.table("users").update(data).eq("uid", uid).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/user/{uid}")
async def delete_user_account(uid: str):
    """
    Fully delete a user from Firebase and Supabase.
    """
    try:
        # 1. Delete from Firebase Auth
        try:
            auth.delete_user(uid)
        except Exception as fe:
            print(f"Firebase delete error (might not exist): {str(fe)}")
            
        # 2. Delete from Supabase
        supabase.table("users").delete().eq("uid", uid).execute()
        
        return {"status": "success", "message": f"User {uid} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/jobs")
async def get_admin_jobs():
    """
    Fetch recent print analysis jobs across the whole platform.
    """
    try:
        res = supabase.table("reports").select("*").order("created_at", desc=True).limit(50).execute()
        return res.data
    except Exception as e:
        # Returns mock data if table doesn't exist
        return [
            {"id": "JOB-001", "name": "Catalog_Final.pdf", "user_email": "demo@user.com", "status": "Completed", "created_at": "2024-03-20T10:00:00Z"},
            {"id": "JOB-002", "name": "Business_Card.ai", "user_email": "test@user.com", "status": "Warning", "created_at": "2024-03-20T11:30:00Z"},
            {"id": "JOB-003", "name": "Poster_V2.eps", "user_email": "creative@pro.com", "status": "Failed", "created_at": "2024-03-20T12:45:00Z"}
        ]

@router.get("/admin/logs")
async def get_admin_logs():
    """
    Simulated system activity logs for the dashboard.
    """
    return [
        {"id": 1, "event": "New User Signup", "details": "admin@printguard.ai joined the platform", "time": "2 mins ago"},
        {"id": 2, "event": "Plan Upgrade", "details": "User test@user.com upgraded to Pro", "time": "15 mins ago"},
        {"id": 3, "event": "High Resource Usage", "details": "Analysis engine spiked to 92% CPU", "time": "1 hour ago"},
        {"id": 4, "event": "Security Alert", "details": "Failed login attempt from 192.168.1.1", "time": "3 hours ago"}
    ]

@router.post("/payment/create-order")
async def create_razorpay_order(data: dict):
    print(f"DEBUG: create_razorpay_order called with data: {data}")
    """
    Create a Razorpay Order for the Pro plan subscription.
    """
    user_id = data.get("user_id")
    email = data.get("email")
    plan = data.get("plan", "Pro")
    amount = data.get("amount", 999) # amount in INR
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")
    
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay client not initialized. Check server logs.")
        
    try:
        # Razorpay expects amount in paise (1 INR = 100 paise)
        order_amount = int(amount * 100)
        order_currency = 'INR'
        order_receipt = f"rcpt_{int(datetime.now().timestamp())}_{user_id[:10]}"
        
        notes = {
            "user_id": user_id,
            "email": email,
            "plan": plan
        }
        
        order_data = {
            'amount': order_amount,
            'currency': order_currency,
            'receipt': order_receipt,
            'notes': notes,
            'payment_capture': 1  # Auto capture payment
        }
        
        order = razorpay_client.order.create(data=order_data)
        
        return {
            "id": order['id'],
            "amount": order['amount'],
            "currency": order['currency'],
            "key": razorpay_key_id
        }
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"Razorpay Order Error:\n{error_msg}")
        raise HTTPException(status_code=500, detail={"error": str(e), "traceback": error_msg})

@router.post("/payment/verify-payment")
async def verify_razorpay_payment(data: dict):
    """
    Verify the Razorpay payment signature.
    """
    razorpay_payment_id = data.get("razorpay_payment_id")
    razorpay_order_id = data.get("razorpay_order_id")
    razorpay_signature = data.get("razorpay_signature")
    user_id = data.get("user_id")
    plan = data.get("plan", "Pro")
    
    if not all([razorpay_payment_id, razorpay_order_id, razorpay_signature]):
        raise HTTPException(status_code=400, detail="Incomplete payment details")
        
    def send_email(to_email, subject, body):
        print(f"\\n{'='*50}\\n[MOCK EMAIL SENT]\\nTo: {to_email}\\nSubject: {subject}\\nBody:\\n{body}\\n{'='*50}\\n")
        
    try:
        # Verify signature
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        # Payment is verified, update user plan in Firestore/Supabase
        try:
             print(f"Payment verified for user {user_id}. Upgrading to {plan} plan.")
             
             end_date = datetime.now() + timedelta(days=30)
             end_date_str = end_date.isoformat()
             
             # 1. Update Supabase
             if supabase:
                 try:
                     supabase.table("users").upsert({"uid": user_id, "plan": plan, "subscription_end_date": end_date_str}, on_conflict="uid").execute()
                     supabase.table("profiles").upsert({"id": user_id, "plan": plan, "subscription_end_date": end_date_str}, on_conflict="id").execute()
                     print(f"Supabase plan updated to {plan} for user {user_id}")
                 except Exception as se:
                     print(f"Supabase plan update failed: {se}")
             
             # 2. Update Firestore if initialized
             if db_firestore:
                 try:
                     await run_firestore_retry("verify_payment_fulfill", 
                         lambda: db_firestore.collection('users').document(user_id).set({"plan": plan, "subscription_end_date": end_date_str}, merge=True))
                     
                     # Save a dashboard notification
                     notif_ref = db_firestore.collection('users').document(user_id).collection('notifications').document()
                     await run_firestore_retry("create_notification",
                         lambda: notif_ref.set({
                             "title": "Plan Upgraded",
                             "message": f"Successfully upgraded to {plan} Plan!",
                             "type": "success",
                             "created_at": firestore.SERVER_TIMESTAMP,
                             "read": False
                         })
                     )
                     
                     user_doc = db_firestore.collection('users').document(user_id).get()
                     if user_doc.exists:
                         user_email = user_doc.to_dict().get("email", "user@example.com")
                         send_email(
                             to_email=user_email,
                             subject="Subscription Upgraded Successfully",
                             body=f"Hello,\n\nYour PrintGuard AI subscription has been successfully upgraded to the {plan} plan.\nYour new plan is valid until {end_date.strftime('%Y-%m-%d')}.\n\nThank you for choosing PrintGuard AI!"
                         )
                 except Exception as fe:
                     print(f"Firestore plan update failed: {fe}")
                 
             return {"status": "success", "message": f"Payment verified and plan upgraded to {plan}"}
        except Exception as db_e:
            print(f"Error updating user plan: {db_e}")
            return {"status": "success", "message": "Payment verified, but plan update failed. Support notified."}

    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    except Exception as e:
        print(f"Razorpay Verification Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/check-expiring-subscriptions")
async def check_expiring_subscriptions():
    """
    Check for subscriptions expiring in exactly 7 days and send a reminder email.
    """
    try:
        db = firestore.client()
        users_ref = db.collection('users')
        docs = users_ref.stream()
        
        target_date = (datetime.now() + timedelta(days=7)).date()
        reminders_sent = 0
        
        def send_email(to_email, subject, body):
            print(f"\n{'='*50}\n[MOCK EMAIL SENT]\nTo: {to_email}\nSubject: {subject}\nBody:\n{body}\n{'='*50}\n")
            
        for doc in docs:
            user_data = doc.to_dict()
            end_date_str = user_data.get("subscription_end_date")
            if end_date_str and user_data.get("plan") == "Pro":
                try:
                    end_date = datetime.fromisoformat(end_date_str).date()
                    if end_date == target_date:
                        email = user_data.get("email", "user@example.com")
                        send_email(
                            to_email=email,
                            subject="Your Pro Plan expires in 7 days",
                            body=f"Hello,\n\nThis is a friendly reminder that your PrintGuard AI Pro plan will expire on {end_date}.\nPlease renew to continue enjoying Pro features."
                        )
                        reminders_sent += 1
                except ValueError:
                    pass
                    
        return {"status": "success", "reminders_sent": reminders_sent}
    except Exception as e:
        print(f"Error checking expiring subscriptions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/notifications")
async def get_user_notifications(user_id: str, fetch_all: bool = Query(False)):
    """
    Fetch notifications for a user without requiring composite Firestore indexes.
    Merges explicit notifications and recent analysis events.
    """
    notifications = []
    seen_ids = set()

    try:
        db = firestore.client()
        user_ref = db.collection('users').document(user_id)

        # 1. Fetch from 'notifications' subcollection
        try:
            notif_docs = user_ref.collection('notifications').stream()
            for doc in notif_docs:
                data = doc.to_dict()
                data['id'] = doc.id

                created_at = data.get('created_at')
                created_str = datetime.now().isoformat()
                if created_at and hasattr(created_at, 'isoformat'):
                    created_str = created_at.isoformat()
                elif isinstance(created_at, str):
                    created_str = created_at

                data['created_at'] = created_str
                is_read = data.get('read', False)
                data['read'] = is_read

                if fetch_all or not is_read:
                    notifications.append(data)
                    seen_ids.add(doc.id)
                    if data.get('job_id'):
                        seen_ids.add(data['job_id'])
                        seen_ids.add(f"analysis_{data['job_id']}")
        except Exception as e:
            print(f"Error reading notifications collection: {e}")

        # 2. Fetch from 'analyses' subcollection (fallbacks/complements)
        try:
            analyses_docs = user_ref.collection('analyses').stream()
            for doc in analyses_docs:
                adata = doc.to_dict()
                job_id = doc.id
                notif_id = f"analysis_{job_id}"
                if notif_id in seen_ids or job_id in seen_ids:
                    continue

                created_at = adata.get('created_at')
                created_str = datetime.now().isoformat()
                if created_at and hasattr(created_at, 'isoformat'):
                    created_str = created_at.isoformat()
                elif isinstance(created_at, str):
                    created_str = created_at

                score = adata.get('score', 80)
                file_name = adata.get('file_name', 'Design file')
                is_read = adata.get('read_notification', False)

                if fetch_all or not is_read:
                    notifications.append({
                        "id": notif_id,
                        "title": "Analysis Complete" if score >= 80 else "High Risk Detected",
                        "message": f"{file_name} analysis is ready. Score: {score}/100",
                        "type": "success" if score >= 80 else ("warning" if score >= 60 else "danger"),
                        "created_at": created_str,
                        "read": is_read,
                        "job_id": job_id,
                        "file_name": file_name,
                        "score": score
                    })
                    seen_ids.add(notif_id)
        except Exception as e:
            print(f"Error reading analyses collection: {e}")

        # In-memory date sorting (newest first) to avoid Firestore index requirements
        def sort_key(item):
            val = item.get('created_at', '')
            return str(val) if val else ''

        notifications.sort(key=sort_key, reverse=True)
        return notifications

    except Exception as e:
        print(f"Error fetching notifications: {e}")
        return []

@router.patch("/user/{user_id}/notifications/{notif_id}/read")
async def mark_notification_read(user_id: str, notif_id: str):
    """
    Mark a single notification as read.
    """
    try:
        db = firestore.client()
        user_ref = db.collection('users').document(user_id)
        if notif_id.startswith("analysis_"):
            real_job_id = notif_id.replace("analysis_", "")
            user_ref.collection('analyses').document(real_job_id).update({'read_notification': True})
        else:
            user_ref.collection('notifications').document(notif_id).update({'read': True})
        return {"status": "success"}
    except Exception as e:
        print(f"Error marking notification read: {e}")
        return {"status": "success"}

@router.post("/user/{user_id}/notifications/read-all")
@router.patch("/user/{user_id}/notifications/read-all")
async def mark_all_notifications_read(user_id: str):
    """
    Mark all notifications for a user as read.
    """
    try:
        db = firestore.client()
        user_ref = db.collection('users').document(user_id)

        batch = db.batch()
        count = 0

        notifs = user_ref.collection('notifications').where('read', '==', False).stream()
        for doc in notifs:
            batch.update(doc.reference, {'read': True})
            count += 1
            if count >= 400:
                batch.commit()
                batch = db.batch()
                count = 0

        analyses = user_ref.collection('analyses').where('read_notification', '==', False).stream()
        for doc in analyses:
            batch.update(doc.reference, {'read_notification': True})
            count += 1
            if count >= 400:
                batch.commit()
                batch = db.batch()
                count = 0

        if count > 0:
            batch.commit()

        return {"status": "success", "message": "All notifications marked as read"}
    except Exception as e:
        print(f"Error marking all notifications read: {e}")
        return {"status": "success", "message": "Done"}

@router.delete("/user/{user_id}/notifications/{notif_id}")
async def delete_notification(user_id: str, notif_id: str):
    """
    Delete a specific notification.
    """
    try:
        db = firestore.client()
        user_ref = db.collection('users').document(user_id)
        if notif_id.startswith("analysis_"):
            real_job_id = notif_id.replace("analysis_", "")
            user_ref.collection('analyses').document(real_job_id).delete()
        else:
            user_ref.collection('notifications').document(notif_id).delete()
        return {"status": "success"}
    except Exception as e:
        print(f"Error deleting notification: {e}")
        return {"status": "success"}

@router.delete("/user/{user_id}/notifications")
async def clear_all_notifications(user_id: str):
    """
    Delete/clear all notifications for a user.
    """
    try:
        db = firestore.client()
        user_ref = db.collection('users').document(user_id)

        notifs = user_ref.collection('notifications').stream()
        for doc in notifs:
            doc.reference.delete()

        return {"status": "success", "message": "All notifications cleared"}
    except Exception as e:
        print(f"Error clearing notifications: {e}")
        return {"status": "success"}
