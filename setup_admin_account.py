import os
import sys
import firebase_admin
from firebase_admin import credentials, auth
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env from backend/.env
env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
load_dotenv(env_path)

# Initialize Firebase
cred_path = os.path.join(os.path.dirname(__file__), 'backend', 'firebase_key.json')
if not os.path.exists(cred_path):
    print(f"Error: {cred_path} not found.")
    sys.exit(1)

cred = credentials.Certificate(cred_path)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

# Initialize Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def setup_admin(email, password):
    print(f"Setting up admin: {email}")
    
    # 1. Create in Firebase
    try:
        user = auth.create_user(
            email=email,
            password=password,
            display_name="System Admin"
        )
        uid = user.uid
        print(f"Successfully created Firebase user with UID: {uid}")
    except Exception as fe:
        if 'EMAIL_EXISTS' in str(fe) or 'already exists' in str(fe).lower():
            user = auth.get_user_by_email(email)
            uid = user.uid
            print(f"User already exists in Firebase. UID: {uid}")
        else:
            print(f"Firebase error: {str(fe)}")
            return

    # 2. Sync/Promote in Supabase
    try:
        # Check if exists
        res = supabase.table("users").select("*").eq("uid", uid).execute()
        if res.data:
            supabase.table("users").update({"role": "Admin", "plan": "Enterprise"}).eq("uid", uid).execute()
            print("Successfully updated existing user to Admin in Supabase.")
        else:
            supabase.table("users").insert({
                "uid": uid,
                "email": email,
                "name": "System Admin",
                "role": "Admin",
                "plan": "Enterprise",
                "status": "Active"
            }).execute()
            print("Successfully created Admin entry in Supabase.")
    except Exception as se:
        print(f"Supabase error: {str(se)}")

if __name__ == "__main__":
    setup_admin("admin@printguard.ai", "Admin@123")
