#!/usr/bin/env python3
"""
Simple model test - Just loads the model and shows info
"""

import os
import numpy as np
from tensorflow import keras
from config import MODEL_PATH, ACTIONS

def main():
    print("="*60)
    print("Simple Model Test - action.h5")
    print("="*60)

    # Check if model exists
    if not os.path.exists(MODEL_PATH):
        print(f"\nERROR: Model file not found at: {MODEL_PATH}")
        return

    print(f"\nModel file: {MODEL_PATH}")
    print(f"File size: {os.path.getsize(MODEL_PATH) / (1024*1024):.2f} MB")

    # Load model
    print("\nLoading model...")
    try:
        model = keras.models.load_model(MODEL_PATH)
        print("✓ Model loaded successfully!")
    except Exception as e:
        print(f"✗ Failed to load model: {e}")
        return

    # Display model info
    print("\n" + "="*60)
    print("MODEL INFORMATION")
    print("="*60)

    print(f"\nActions: {ACTIONS}")
    print(f"Number of actions: {len(ACTIONS)}")

    print("\nModel Architecture:")
    model.summary()

    print("\n" + "="*60)
    print("MODEL INPUT/OUTPUT")
    print("="*60)

    print(f"\nInput shape: {model.input_shape}")
    print(f"Output shape: {model.output_shape}")

    # Test prediction with dummy data
    print("\n" + "="*60)
    print("TESTING WITH DUMMY DATA")
    print("="*60)

    try:
        # Create dummy input (sequence_length, keypoint_dim)
        sequence_length = model.input_shape[1]
        keypoint_dim = model.input_shape[2]

        print(f"\nSequence length: {sequence_length} frames")
        print(f"Keypoints per frame: {keypoint_dim}")
        print(f"Expected keypoints: 33*4 (pose) + 468*3 (face) + 21*3 (left hand) + 21*3 (right hand) = 1662")

        # Create random dummy data
        dummy_data = np.random.random((1, sequence_length, keypoint_dim))

        print("\nRunning prediction on dummy data...")
        predictions = model.predict(dummy_data, verbose=0)[0]

        print("\nPrediction results:")
        for i, action in enumerate(ACTIONS):
            print(f"  {action}: {predictions[i]:.4f} ({predictions[i]*100:.2f}%)")

        predicted_action = ACTIONS[np.argmax(predictions)]
        confidence = np.max(predictions)

        print(f"\nPredicted action: {predicted_action}")
        print(f"Confidence: {confidence:.4f} ({confidence*100:.2f}%)")

        print("\n✓ Model is working correctly!")

    except Exception as e:
        print(f"\n✗ Error during prediction test: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "="*60)
    print("To test with webcam, run: python test_model_local.py")
    print("="*60)


if __name__ == '__main__':
    main()
