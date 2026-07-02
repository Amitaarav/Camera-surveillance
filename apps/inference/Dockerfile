FROM ultralytics/ultralytics:latest-cpu

WORKDIR /workspace

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Pre-download the YOLOv8n model so it's baked into the image
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

CMD ["python", "main.py"]
