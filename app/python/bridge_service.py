import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from model_processor import ModelProcessor
from arduino_controller import ArduinoController
from config import DEFAULT_PROBABILITY_THRESHOLD, SERVER_PORT

app = Flask(__name__)
CORS(app)

# Initialize components
processor = None
arduino = None
current_threshold = DEFAULT_PROBABILITY_THRESHOLD


def init_components():
    global processor, arduino
    try:
        processor = ModelProcessor()
        arduino = ArduinoController()
        print("Components initialized successfully")
    except Exception as e:
        print(f"Error initializing components: {e}")


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_loaded': processor is not None and processor.model is not None,
        'arduino_connected': arduino is not None and arduino.connection is not None if arduino else False
    })


@app.route('/process_frame', methods=['POST'])
def process_frame():
    try:
        data = request.json
        frame_data = data.get('frame')
        threshold = data.get('threshold', current_threshold)

        if not frame_data:
            return jsonify({'success': False, 'error': 'No frame data provided'}), 400

        if not processor:
            return jsonify({'success': False, 'error': 'Model processor not initialized'}), 500

        result = processor.process_frame(frame_data, threshold)

        if result:
            # Trigger Arduino if action detected
            if arduino:
                arduino.trigger(result['action'])

            return jsonify({
                'success': True,
                'detected': True,
                'action': result['action'],
                'confidence': result['confidence'],
                'probabilities': result['probabilities']
            })
        else:
            return jsonify({
                'success': True,
                'detected': False
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/trigger_arduino', methods=['POST'])
def trigger_arduino():
    try:
        data = request.json
        action = data.get('action', 'trigger')

        if not arduino:
            return jsonify({'success': False, 'error': 'Arduino not initialized'}), 500

        success = arduino.trigger(action)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/set_threshold', methods=['POST'])
def set_threshold():
    global current_threshold
    try:
        data = request.json
        threshold = float(data.get('threshold', DEFAULT_PROBABILITY_THRESHOLD))
        current_threshold = threshold
        return jsonify({'success': True, 'threshold': current_threshold})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    print("Initializing WetReminder Python Bridge Service...")
    init_components()
    print(f"Starting server on http://localhost:{SERVER_PORT}")
    app.run(host='localhost', port=SERVER_PORT, debug=False)
