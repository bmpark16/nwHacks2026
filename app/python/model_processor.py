import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
import cv2
# Temporarily disable MediaPipe import/usage for testing on systems
# where MediaPipe isn't installed or has an incompatible API.
# To re-enable, restore the import below and the mp_holistic/mp_drawing
# assignments.
# import mediapipe as mp
# mp_holistic = mp.solutions.holistic  # Holistic model
# mp_drawing = mp.solutions.drawing_utils  # Drawing utilities

mp = None

# Fallbacks so the rest of the module can import and run without MediaPipe.
mp_holistic = None
mp_drawing = None

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
        # If MediaPipe has been disabled (mp_holistic is None) skip initialization
        if mp_holistic is None:
            print("MediaPipe disabled - skipping MediaPipe Holistic initialization")
            self.holistic = None
            return

        # Use configuration constants so behavior matches the original notebook
        # (falls back to 0.5 if config values are not sensible)
        min_det = MEDIAPIPE_MIN_DETECTION_CONFIDENCE if MEDIAPIPE_MIN_DETECTION_CONFIDENCE is not None else 0.5
        min_track = MEDIAPIPE_MIN_TRACKING_CONFIDENCE if MEDIAPIPE_MIN_TRACKING_CONFIDENCE is not None else 0.5

        self.holistic = mp_holistic.Holistic(
            min_detection_confidence=min_det,
            min_tracking_confidence=min_track
        )

    def mediapipe_detection(self, image):
        """Perform MediaPipe detection on image"""
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = self.holistic.process(image)
        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        return image, results

    def draw_styled_landmarks(self, image, results):
        """Draw styled landmarks on image"""
        if not mp_drawing:
            return

        # Draw face landmarks (using FaceMesh constants)
        if results.face_landmarks:
            mp_drawing.draw_landmarks(
                image,
                results.face_landmarks,
                mp.solutions.face_mesh.FACEMESH_CONTOURS,
                mp_drawing.DrawingSpec(color=(80,110,10), thickness=1, circle_radius=1),
                mp_drawing.DrawingSpec(color=(80,256,121), thickness=1, circle_radius=1)
            )

        # Draw pose connections
        if results.pose_landmarks:
            mp_drawing.draw_landmarks(
                image,
                results.pose_landmarks,
                mp_holistic.POSE_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(80,22,10), thickness=2, circle_radius=4),
                mp_drawing.DrawingSpec(color=(80,44,121), thickness=2, circle_radius=2)
            )

        # Draw left hand connections
        if results.left_hand_landmarks:
            mp_drawing.draw_landmarks(
                image,
                results.left_hand_landmarks,
                mp_holistic.HAND_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(121,22,76), thickness=2, circle_radius=4),
                mp_drawing.DrawingSpec(color=(121,44,250), thickness=2, circle_radius=2)
            )

        # Draw right hand connections
        if results.right_hand_landmarks:
            mp_drawing.draw_landmarks(
                image,
                results.right_hand_landmarks,
                mp_holistic.HAND_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=4),
                mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2)
            )

    def draw_landmarks(self, image, results):
        """Draw basic landmarks on image (matches the notebook's simple overlay).

        - Uses face_mesh FACEMESH_TESSELATION for face landmarks
        - Uses POSE_CONNECTIONS and HAND_CONNECTIONS for pose and hands
        """
        # Face (use FaceMesh tessellation to show the face mesh)
        if results.face_landmarks:
            mp_drawing.draw_landmarks(
                image,
                results.face_landmarks,
                mp.solutions.face_mesh.FACEMESH_TESSELATION
            )

        # Pose
        if results.pose_landmarks:
            mp_drawing.draw_landmarks(
                image,
                results.pose_landmarks,
                mp_holistic.POSE_CONNECTIONS
            )

        # Left hand
        if results.left_hand_landmarks:
            mp_drawing.draw_landmarks(
                image,
                results.left_hand_landmarks,
                mp_holistic.HAND_CONNECTIONS
            )

        # Right hand
        if results.right_hand_landmarks:
            mp_drawing.draw_landmarks(
                image,
                results.right_hand_landmarks,
                mp_holistic.HAND_CONNECTIONS
            )

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

        # If MediaPipe is disabled or the Holistic instance wasn't created,
        # skip processing and return None so the bridge can continue.
        if self.holistic is None:
            # Optionally decode the image to ensure no errors upstream, but
            # for testing we simply skip model prediction.
            print("MediaPipe not available - skipping frame processing")
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
