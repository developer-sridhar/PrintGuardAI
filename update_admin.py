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

def update_admin_password(email, new_password):
    print(f"Updating admin: {email}")
    try:
        user = auth.get_user_by_email(email)
        auth.update_user(user.uid, password=new_password)
        print(f"Successfully updated password for {email}. UID: {user.uid}")
        return user.uid
    except Exception as e:
        if 'not found' in str(e).lower():
            # Create if not exists
            user = auth.create_user(email=email, password=new_password, display_name="Super Admin")
            print(f"Successfully created Super Admin in Firebase. UID: {user.uid}")
            return user.uid
        else:
            print(f"Error: {str(e)}")
            return None

if __name__ == "__main__":
    uid = update_admin_password("admin@printguard.ai", "PrintguardAI@")
    if uid:
        print(f"\nFINAL ADMIN UID: {uid}")
        print("Please use this UID in your Supabase SQL if you need to manually insert it.")
