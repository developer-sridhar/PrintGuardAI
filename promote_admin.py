import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
    sys.exit(1)

supabase: Client = create_client(url, key)

def promote_user(email):
    try:
        res = supabase.table("users").update({"role": "Admin"}).eq("email", email).execute()
        if res.data:
            print(f"Successfully promoted {email} to Admin!")
        else:
            print(f"User with email {email} not found in Supabase 'users' table.")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python promote_admin.py <email>")
    else:
        promote_user(sys.argv[1])
