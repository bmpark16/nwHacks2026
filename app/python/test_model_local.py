#!/usr/bin/env python3
"""
Local model testing script - Tests action.h5 model with webcam
Press 'q' to quit
"""

import cv2
import numpy as np
from model_processor import ModelProcessor
from config import DEFAULT_PROBABILITY_THRESHOLD

def draw_info(frame, result, threshold):
    """Draw information overlay on frame"""
    # Draw semi-transparent overlay at top
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (frame.shape[1], 120), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

    # Display threshold
    cv2.putText(frame, f"Threshold: {threshold:.2f}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    if result:
        # Detection found
        action = result['action']
        confidence = result['confidence']

        # Color based on action
        color = (0, 0, 255) if action.lower() == 'doomscrolling' else (0, 255, 0)

        # Draw detection
        cv2.putText(frame, f"Action: {action}", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        cv2.putText(frame, f"Confidence: {confidence:.2%}", (10, 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        # Draw probabilities
        y_offset = 130
        for action_name, prob in result['probabilities'].items():
            bar_width = int(prob * 300)
            cv2.rectangle(frame, (10, y_offset), (10 + bar_width, y_offset + 20),
                         (0, 255, 0), -1)
            cv2.putText(frame, f"{action_name}: {prob:.2%}", (320, y_offset + 15),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            y_offset += 30
    else:
        # No detection
        cv2.putText(frame, "Status: Monitoring...", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 255), 2)

    # Instructions
    instructions = "Press 'q' to quit | '+'/'-' to adjust threshold"
    cv2.putText(frame, instructions, (10, frame.shape[0] - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

    return frame


def main():
    print("="*60)
    print("Local Model Test - action.h5")
    print("="*60)

    # Initialize model processor
    print("\nInitializing model processor...")
    processor = ModelProcessor()

    if not processor.model:
        print("ERROR: Model failed to load. Check if action.h5 exists.")
        return

    print("Model loaded successfully!")
    print(f"Actions: {', '.join(processor.model.output_names) if hasattr(processor.model, 'output_names') else 'sleeping, doomscrolling'}")

    # Initialize webcam
    print("\nOpening webcam...")
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("ERROR: Could not open webcam")
        return

    print("Webcam opened successfully!")
    print("\nControls:")
    print("  q - Quit")
    print("  + - Increase threshold")
    print("  - - Decrease threshold")
    print("\nStarting detection...\n")

    threshold = DEFAULT_PROBABILITY_THRESHOLD
    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break

        frame_count += 1

        # Make detection
        image, results = processor.mediapipe_detection(frame)

        # Extract keypoints
        keypoints = processor.extract_keypoints(results)

        # Add to sequence
        processor.sequence.append(keypoints)
        processor.sequence = processor.sequence[-30:]  # SEQUENCE_LENGTH

        result = None
        # Predict if we have enough frames
        if len(processor.sequence) == 30:
            res = processor.model.predict(np.expand_dims(
                processor.sequence, axis=0), verbose=0)[0]

            max_prob = np.max(res)
            predicted_action = processor.model.output_names[np.argmax(res)] if hasattr(processor.model, 'output_names') else ['sleeping', 'doomscrolling'][np.argmax(res)]

            if max_prob > threshold:
                result = {
                    'action': predicted_action,
                    'confidence': float(max_prob),
                    'probabilities': {'sleeping': float(res[0]), 'doomscrolling': float(res[1])}
                }

                # Print detection to console
                print(f"[Frame {frame_count}] DETECTED: {predicted_action} ({max_prob:.2%})")

        # Draw info on frame
        display_frame = draw_info(image, result, threshold)

        # Show frame
        cv2.imshow('Model Test - action.h5', display_frame)

        # Handle keyboard input
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            print("\nQuitting...")
            break
        elif key == ord('+') or key == ord('='):
            threshold = min(1.0, threshold + 0.05)
            print(f"Threshold increased to {threshold:.2f}")
        elif key == ord('-') or key == ord('_'):
            threshold = max(0.0, threshold - 0.05)
            print(f"Threshold decreased to {threshold:.2f}")

    # Cleanup
    cap.release()
    cv2.destroyAllWindows()
    print("\nTest completed!")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
