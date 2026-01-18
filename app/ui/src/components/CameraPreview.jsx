import { useEffect, useRef } from 'react';
import './CameraPreview.css';

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
        ctx.fillText('Status: Monitoring...', 20, 35);
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
