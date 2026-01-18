import os

# Model configuration
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'action.h5')
# The trained model expects labels in the order used during training.
# The original training notebook used ['doomscrolling', 'nothing'].
# Keep this aligned with the model that lives at `action.h5`.
ACTIONS = ['doomscrolling', 'nothing']

# MediaPipe configuration
MEDIAPIPE_MIN_DETECTION_CONFIDENCE = 0.5
MEDIAPIPE_MIN_TRACKING_CONFIDENCE = 0.5

# LSTM model configuration
# Sequence length must match the length used when training the LSTM.
# The training notebook used 150-frame sequences.
SEQUENCE_LENGTH = 150
KEYPOINT_DIM = 1662

# Probability threshold (can be overridden by settings)
DEFAULT_PROBABILITY_THRESHOLD = 0.5

# Arduino configuration
ARDUINO_PORT = None  # Will be set from settings or auto-detected
ARDUINO_BAUDRATE = 9600

# Server configuration
SERVER_HOST = 'localhost'
SERVER_PORT = 5000
