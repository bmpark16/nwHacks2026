import os

# Model configuration
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'action.h5')
ACTIONS = ['sleeping', 'doomscrolling']

# MediaPipe configuration
MEDIAPIPE_MIN_DETECTION_CONFIDENCE = 0.5
MEDIAPIPE_MIN_TRACKING_CONFIDENCE = 0.5

# LSTM model configuration
SEQUENCE_LENGTH = 30
KEYPOINT_DIM = 1662

# Probability threshold (can be overridden by settings)
DEFAULT_PROBABILITY_THRESHOLD = 0.8

# Arduino configuration
ARDUINO_PORT = None  # Will be set from settings or auto-detected
ARDUINO_BAUDRATE = 9600

# Server configuration
SERVER_HOST = 'localhost'
SERVER_PORT = 5000
