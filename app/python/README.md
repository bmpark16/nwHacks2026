# Python Bridge Service

This directory contains the Python bridge service that handles LSTM model evaluation and Arduino communication.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Place your trained model file (`action.h5`) in this directory.

3. The service will automatically start when the Electron app launches.

## Configuration

Edit `config.py` to adjust:
- Model path
- Probability threshold
- Arduino port (or leave as None for auto-detection)
- Server port

## Manual Testing

You can test the service manually by running:
```bash
python bridge_service.py
```

Then test the endpoints:
- Health check: `curl http://localhost:5000/health`
- Process frame: `curl -X POST http://localhost:5000/process_frame -H "Content-Type: application/json" -d '{"frame": "base64_encoded_image"}'`
