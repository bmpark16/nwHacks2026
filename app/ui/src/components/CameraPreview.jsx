import { useEffect, useRef } from 'react';
import './CameraPreview.css';

function CameraPreview({ isActive, cameraId, onFrameCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const frameIntervalRef = useRef(null);

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

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div className="camera-preview-container">
      {isActive ? (
        <>
          <video
            ref={videoRef}
            className="camera-preview-video"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </>
      ) : (
        <div className="camera-preview-placeholder">
          <span>CAMERA PREVIEW</span>
        </div>
      )}
    </div>
  );
}

export default CameraPreview;
