import os
import sys
import base64
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from model_processor import ModelProcessor
from arduino_controller import ArduinoController
from config import DEFAULT_PROBABILITY_THRESHOLD, SERVER_PORT, SEQUENCE_LENGTH, KEYPOINT_DIM, ACTIONS

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

        # If MediaPipe is disabled, convert the raw webcam image into a
        # deterministic feature vector so the LSTM model can still be exercised
        # during testing. We downsample the image to a fixed grayscale size,
        # flatten, then truncate/pad to KEYPOINT_DIM.
        if processor and getattr(processor, 'holistic', None) is None:
            try:
                # frame_data is expected to be a data URL or base64 string
                if ',' in frame_data:
                    frame_b64 = frame_data.split(',')[1]
                else:
                    frame_b64 = frame_data

                img_bytes = base64.b64decode(frame_b64)
                nparr = np.frombuffer(img_bytes, np.uint8)
                import cv2
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if frame is None:
                    return jsonify({'success': False, 'error': 'Could not decode image'}), 400

                # Convert to grayscale and resize to approx sqrt(KEYPOINT_DIM)
                side = int(np.ceil(np.sqrt(KEYPOINT_DIM)))
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                small = cv2.resize(gray, (side, side), interpolation=cv2.INTER_AREA)
                vec = small.flatten().astype(np.float32) / 255.0

                # Truncate or pad to KEYPOINT_DIM
                if vec.size >= KEYPOINT_DIM:
                    vec = vec[:KEYPOINT_DIM]
                else:
                    pad = np.zeros(KEYPOINT_DIM - vec.size, dtype=np.float32)
                    vec = np.concatenate([vec, pad])

                # Append to processor sequence
                processor.sequence.append(vec)
                processor.sequence = processor.sequence[-SEQUENCE_LENGTH:]

                # If enough frames, predict
                if len(processor.sequence) == SEQUENCE_LENGTH:
                    res = processor.model.predict(np.expand_dims(processor.sequence, axis=0), verbose=0)[0]
                    max_prob = float(np.max(res))
                    predicted_action = ACTIONS[int(np.argmax(res))]

                    if max_prob > threshold:
                        return jsonify({
                            'success': True,
                            'detected': True,
                            'action': predicted_action,
                            'confidence': max_prob,
                            'probabilities': {ACTIONS[i]: float(res[i]) for i in range(len(ACTIONS))}
                        })
                    else:
                        return jsonify({'success': True, 'detected': False})

                return jsonify({'success': True, 'detected': False})
            except Exception as e:
                return jsonify({'success': False, 'error': str(e)}), 500

        # Default path: use existing processor flow (which may call MediaPipe)
        result = processor.process_frame(frame_data, threshold)

        if result:
            # Trigger Arduino servo if doomscrolling detected
            arduino_triggered = False
            if arduino and result['action'].lower() == 'doomscrolling':
                arduino_triggered = arduino.trigger('doomscrolling')
                print(f"Doomscrolling detected! Triggering servo sweep.")

            return jsonify({
                'success': True,
                'detected': True,
                'action': result['action'],
                'confidence': result['confidence'],
                'probabilities': result['probabilities'],
                'arduino_triggered': arduino_triggered
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


@app.route('/servo/start', methods=['POST'])
def start_servo():
    """Start continuous servo sweeping"""
    try:
        if not arduino:
            return jsonify({'success': False, 'error': 'Arduino not initialized'}), 500

        success = arduino.start_auto_mode()
        return jsonify({'success': success, 'message': 'Continuous sweeping started'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/servo/stop', methods=['POST'])
def stop_servo():
    """Stop continuous servo sweeping"""
    try:
        if not arduino:
            return jsonify({'success': False, 'error': 'Arduino not initialized'}), 500

        success = arduino.stop_auto_mode()
        return jsonify({'success': success, 'message': 'Servo stopped and reset'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/servo/trigger', methods=['POST'])
def trigger_servo():
    """Trigger a single servo sweep"""
    try:
        if not arduino:
            return jsonify({'success': False, 'error': 'Arduino not initialized'}), 500

        success = arduino.trigger('single')
        return jsonify({'success': success, 'message': 'Single sweep triggered'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/feed_flag', methods=['POST'])
def feed_flag():
    """Accept a synthetic flag (1 or 0) and trigger the Arduino when flag==1.

    Useful for testing the servo wiring without running the ML model.
    Request JSON: {"flag": 1}
    """
    try:
        data = request.json or {}
        if 'flag' not in data:
            return jsonify({'success': False, 'error': 'No flag provided'}), 400

        try:
            flag = int(data.get('flag'))
        except Exception:
            return jsonify({'success': False, 'error': 'flag must be integer 0 or 1'}), 400

        if not arduino:
            return jsonify({'success': False, 'error': 'Arduino not initialized'}), 500

        if flag == 1:
            ok = arduino.trigger('single')
            return jsonify({'success': ok, 'triggered': ok})
        else:
            return jsonify({'success': True, 'triggered': False})
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
