#!/usr/bin/env python3
"""
Simple model test with dummy keypoints - bypasses MediaPipe issues
Tests only doomscrolling detection
"""

import os
import numpy as np
from tensorflow import keras
from config import MODEL_PATH, ACTIONS, SEQUENCE_LENGTH, KEYPOINT_DIM

def simulate_doomscrolling_keypoints():
    """Generate simulated keypoints that might represent doomscrolling posture"""
    # Create keypoint pattern that simulates:
    # - Head tilted down (phone looking posture)
    # - One hand raised (holding phone)
    # - Thumb moving (scrolling motion)

    keypoints = np.zeros(KEYPOINT_DIM)

    # Simulate head tilt (modify face keypoints to be lower)
    face_start = 33 * 4  # After pose landmarks
    face_keypoints = np.random.uniform(0.3, 0.7, 468 * 3)  # Face in middle-lower region
    keypoints[face_start:face_start + 468*3] = face_keypoints

    # Simulate raised hand (left hand)
    lh_start = 33*4 + 468*3  # After pose and face
    left_hand = np.random.uniform(0.4, 0.6, 21 * 3)  # Hand near face
    keypoints[lh_start:lh_start + 21*3] = left_hand

    # Right hand lower (holding phone)
    rh_start = lh_start + 21*3
    right_hand = np.random.uniform(0.5, 0.7, 21 * 3)
    keypoints[rh_start:rh_start + 21*3] = right_hand

    # Pose landmarks (body slightly hunched)
    pose = np.random.uniform(0.3, 0.6, 33 * 4)
    keypoints[0:33*4] = pose

    return keypoints

def main():
    print("="*60)
    print("Model Test - Doomscrolling Detection (Dummy Keypoints)")
    print("="*60)

    # Check if model exists
    if not os.path.exists(MODEL_PATH):
        print(f"\nERROR: Model file not found at: {MODEL_PATH}")
        return

    print(f"\nModel file: {MODEL_PATH}")

    # Load model
    print("\nLoading model...")
    try:
        model = keras.models.load_model(MODEL_PATH)
        print("✓ Model loaded successfully!")
    except Exception as e:
        print(f"✗ Failed to load model: {e}")
        return

    print(f"\nActions: {ACTIONS}")
    print(f"Testing only: doomscrolling")
    print(f"\nSequence length: {SEQUENCE_LENGTH} frames")
    print(f"Keypoints per frame: {KEYPOINT_DIM}")

    # Test with simulated doomscrolling sequence
    print("\n" + "="*60)
    print("TESTING DOOMSCROLLING DETECTION")
    print("="*60)

    try:
        # Create a sequence of simulated doomscrolling frames
        sequence = []
        for i in range(SEQUENCE_LENGTH):
            keypoints = simulate_doomscrolling_keypoints()
            sequence.append(keypoints)

        sequence = np.array(sequence)
        print(f"\nGenerated sequence shape: {sequence.shape}")
        print(f"Expected shape: ({SEQUENCE_LENGTH}, {KEYPOINT_DIM})")

        # Make prediction
        print("\nRunning prediction...")
        predictions = model.predict(np.expand_dims(sequence, axis=0), verbose=0)[0]

        print("\nPrediction results:")
        for i, action in enumerate(ACTIONS):
            print(f"  {action}: {predictions[i]:.4f} ({predictions[i]*100:.2f}%)")

        predicted_action = ACTIONS[np.argmax(predictions)]
        confidence = np.max(predictions)

        print(f"\nPredicted action: {predicted_action}")
        print(f"Confidence: {confidence:.4f} ({confidence*100:.2f}%)")

        # Check if NaN
        if np.isnan(predictions).any():
            print("\n⚠️  WARNING: Model returned NaN values")
            print("   This indicates the model weights may be corrupted")
            print("   The model needs to be retrained")
        elif predicted_action == 'doomscrolling':
            print("\n✓ Model detected doomscrolling pattern!")
        else:
            print(f"\n✓ Model working but classified as: {predicted_action}")

    except Exception as e:
        print(f"\n✗ Error during prediction test: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "="*60)
    print("NOTE: This test uses simulated keypoints")
    print("Real testing requires MediaPipe Holistic (not available in v0.10.30+)")
    print("="*60)


if __name__ == '__main__':
    main()
