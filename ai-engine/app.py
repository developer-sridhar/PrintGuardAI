from flask import Flask, request, jsonify
import cv2
import numpy as np
from PIL import Image
import io
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS so frontend/backend can fetch

@app.route('/')
def home():
    return "PRINT GUARD AI Engine is Running"

@app.route('/analyze', methods=['POST'])
def analyze_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files['image']
    file_bytes = file.read()

    # PIL for DPI detection
    pil_image = Image.open(io.BytesIO(file_bytes))
    dpi = pil_image.info.get("dpi", (72, 72))[0]  # Default 72 if not found

    # OpenCV image
    np_img = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

    if img is None:
        return jsonify({"error": "Invalid image"}), 400

    height, width, channels = img.shape
    total_pixels = height * width

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    dark_pixels = np.sum(gray < 50)
    ink_density = (dark_pixels / total_pixels) * 100

    # Print size calculation
    width_inch = width / dpi
    height_inch = height / dpi

    width_cm = width_inch * 2.54
    height_cm = height_inch * 2.54

    # Resolution score
    resolution_score = 100 if dpi >= 300 else 60

    return jsonify({
        "width_px": width,
        "height_px": height,
        "dpi": dpi,
        "print_width_cm": round(width_cm, 2),
        "print_height_cm": round(height_cm, 2),
        "ink_density_percent": round(ink_density, 2),
        "resolution_score": resolution_score
    })

if __name__ == "__main__":
    app.run(port=5001, debug=True)
