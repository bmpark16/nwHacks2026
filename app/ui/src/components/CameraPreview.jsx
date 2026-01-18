import { useEffect, useRef } from 'react';
import './CameraPreview.css';

// Helper function to draw MediaPipe landmarks
const drawLandmarks = (ctx, landmarks, width, height) => {
  // Draw pose landmarks (body skeleton)
  if (landmarks.pose) {
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#00FF00';

    // Draw pose connections (simplified - main body lines)
    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
      [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28] // Torso and legs
    ];

    connections.forEach(([start, end]) => {
      const startPoint = landmarks.pose[start];
      const endPoint = landmarks.pose[end];
      if (startPoint && endPoint && startPoint[3] > 0.5 && endPoint[3] > 0.5) {
        ctx.beginPath();
        ctx.moveTo(startPoint[0] * width, startPoint[1] * height);
        ctx.lineTo(endPoint[0] * width, endPoint[1] * height);
        ctx.stroke();
      }
    });

    // Draw pose points
    landmarks.pose.forEach((point) => {
      if (point[3] > 0.5) { // visibility threshold
        ctx.beginPath();
        ctx.arc(point[0] * width, point[1] * height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }

  // Draw face landmarks
  if (landmarks.face) {
    ctx.fillStyle = '#FF00FF';
    landmarks.face.slice(0, 20).forEach((point) => { // Draw only outline points
      ctx.beginPath();
      ctx.arc(point[0] * width, point[1] * height, 1, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  // Draw hand landmarks
  const drawHand = (hand, color) => {
    if (!hand) return;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    // Hand connections
    const handConnections = [
      [0,1],[1,2],[2,3],[3,4], // Thumb
      [0,5],[5,6],[6,7],[7,8], // Index
      [0,9],[9,10],[10,11],[11,12], // Middle
      [0,13],[13,14],[14,15],[15,16], // Ring
      [0,17],[17,18],[18,19],[19,20] // Pinky
    ];

    handConnections.forEach(([start, end]) => {
      const startPoint = hand[start];
      const endPoint = hand[end];
      if (startPoint && endPoint) {
        ctx.beginPath();
        ctx.moveTo(startPoint[0] * width, startPoint[1] * height);
        ctx.lineTo(endPoint[0] * width, endPoint[1] * height);
        ctx.stroke();
      }
    });

    // Draw hand points
    hand.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point[0] * width, point[1] * height, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  drawHand(landmarks.left_hand, '#00FFFF');
  drawHand(landmarks.right_hand, '#FFFF00');
};

function CameraPreview({ isActive, cameraId, onFrameCapture, currentPrediction }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (isActive && cameraId) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive, cameraId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: cameraId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start capturing frames
      if (canvasRef.current && onFrameCapture) {
        frameIntervalRef.current = setInterval(() => {
          captureFrame();
        }, 100); // Capture every 100ms (10 fps for model)
      }
    } catch (error) {
      console.error('Error starting camera:', error);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 and send to parent
    const frameData = canvas.toDataURL('image/jpeg', 0.8);
    if (onFrameCapture) {
      console.log('Capturing frame, size:', frameData.length);
      onFrameCapture(frameData);
    }
  };

  const stopCamera = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Draw overlay with prediction info
  useEffect(() => {
    if (!isActive || !overlayCanvasRef.current || !videoRef.current) return;

    const drawOverlay = () => {
      const canvas = overlayCanvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Clear previous overlay
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      console.log('Drawing overlay, currentPrediction:', currentPrediction);

      // Draw MediaPipe landmarks if available
      if (currentPrediction && currentPrediction.landmarks) {
        drawLandmarks(ctx, currentPrediction.landmarks, canvas.width, canvas.height);
      }

      if (currentPrediction && currentPrediction.detected) {
        const { action, confidence, probabilities } = currentPrediction;

        // Draw semi-transparent overlay at top
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, 120);

        // Determine color based on action
        const color = action.toLowerCase() === 'doomscrolling' ? '#ef4444' : '#22c55e';

        // Draw action text
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = color;
        ctx.fillText(`Action: ${action}`, 20, 45);

        // Draw confidence
        ctx.font = '24px Arial';
        ctx.fillStyle = color;
        ctx.fillText(`Confidence: ${(confidence * 100).toFixed(1)}%`, 20, 80);

        // Draw probability bars
        if (probabilities) {
          let yOffset = 140;
          Object.entries(probabilities).forEach(([name, prob]) => {
            const barWidth = Math.floor(prob * 300);

            // Draw bar background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(20, yOffset, 300, 25);

            // Draw bar fill
            ctx.fillStyle = name.toLowerCase() === 'doomscrolling' ? '#ef4444' : '#22c55e';
            ctx.fillRect(20, yOffset, barWidth, 25);

            // Draw label
            ctx.font = '16px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${name}: ${(prob * 100).toFixed(1)}%`, 330, yOffset + 18);

            yOffset += 35;
          });
        }
      } else {
        // Show monitoring status
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, 60);

        ctx.font = '20px Arial';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Status: Monitoring... (model needs 15s to warm up)', 20, 35);
      }

      animationFrameRef.current = requestAnimationFrame(drawOverlay);
    };

    drawOverlay();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, currentPrediction]);

  return (
    <div className="camera-preview-container">
      {isActive ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <video
            ref={videoRef}
            className="camera-preview-video"
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={overlayCanvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      ) : (
        <div className="camera-preview-placeholder">
          <span>CAMERA PREVIEW</span>
        </div>
      )}
    </div>
  );
}

export default CameraPreview;
