import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
import cv2
import mediapipe as mp
from config import (
    MODEL_PATH, ACTIONS, SEQUENCE_LENGTH, KEYPOINT_DIM,
    MEDIAPIPE_MIN_DETECTION_CONFIDENCE, MEDIAPIPE_MIN_TRACKING_CONFIDENCE
)


class ModelProcessor:
    def __init__(self):
        self.model = None
        self.holistic = None
        self.sequence = []
        self.load_model()
        self.init_mediapipe()

    def load_model(self):
        """Load the trained LSTM model"""
        try:
            if os.path.exists(MODEL_PATH):
                self.model = keras.models.load_model(MODEL_PATH)
                print(f"Model loaded from {MODEL_PATH}")
            else:
                print(f"Warning: Model file not found at {MODEL_PATH}")
        except Exception as e:
            print(f"Error loading model: {e}")

    def init_mediapipe(self):
        """Initialize MediaPipe Holistic"""
        self.holistic = mp.solutions.holistic.Holistic(
            min_detection_confidence=MEDIAPIPE_MIN_DETECTION_CONFIDENCE,
            min_tracking_confidence=MEDIAPIPE_MIN_TRACKING_CONFIDENCE
        )

    def mediapipe_detection(self, image):
        """Perform MediaPipe detection on image"""
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = self.holistic.process(image)
        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        return image, results

    def extract_keypoints(self, results):
        """Extract keypoints from MediaPipe results"""
        pose = np.array([[res.x, res.y, res.z, res.visibility]
                        for res in results.pose_landmarks.landmark]).flatten() if results.pose_landmarks else np.zeros(33*4)
        face = np.array([[res.x, res.y, res.z]
                        for res in results.face_landmarks.landmark]).flatten() if results.face_landmarks else np.zeros(468*3)
        lh = np.array([[res.x, res.y, res.z]
                      for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(21*3)
        rh = np.array([[res.x, res.y, res.z]
                      for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(21*3)
        return np.concatenate([pose, face, lh, rh])

    def process_frame(self, frame_data, threshold=0.8):
        """Process a single frame and return prediction"""
        if not self.model:
            return None

        try:
            # Decode base64 image
            import base64
            from io import BytesIO

            # Remove data URL prefix if present
            if ',' in frame_data:
                frame_data = frame_data.split(',')[1]

            img_data = base64.b64decode(frame_data)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                return None

            # Make detection
            image, results = self.mediapipe_detection(frame)

            # Extract keypoints
            keypoints = self.extract_keypoints(results)

            # Add to sequence
            self.sequence.append(keypoints)
            self.sequence = self.sequence[-SEQUENCE_LENGTH:]

            # Predict if we have enough frames
            if len(self.sequence) == SEQUENCE_LENGTH:
                res = self.model.predict(np.expand_dims(
                    self.sequence, axis=0), verbose=0)[0]

                max_prob = np.max(res)
                predicted_action = ACTIONS[np.argmax(res)]

                if max_prob > threshold:
                    return {
                        'action': predicted_action,
                        'confidence': float(max_prob),
                        'probabilities': {ACTIONS[i]: float(res[i]) for i in range(len(ACTIONS))}
                    }

            return None
        except Exception as e:
            print(f"Error processing frame: {e}")
            return None
