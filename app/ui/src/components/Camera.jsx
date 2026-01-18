import { useState, useRef, useEffect } from 'react';
import './Camera.css';

function Camera() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      setError(null);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      // Store stream reference for cleanup
      streamRef.current = stream;

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError(getErrorMessage(err));
      setIsStreaming(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setError(null);
  };

  const getErrorMessage = (err) => {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return 'Camera permission denied. Please allow camera access and try again.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return 'No camera found. Please connect a camera and try again.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      return 'Camera is already in use by another application.';
    } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
      return 'Camera constraints not satisfied. Trying with default settings...';
    } else {
      return `Error accessing camera: ${err.message}`;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="camera-container">
      <div className="camera-wrapper">
        <video
          ref={videoRef}
          className="camera-video"
          autoPlay
          playsInline
          muted
        />
        {!isStreaming && !error && (
          <div className="camera-placeholder">
            <p>Camera feed will appear here</p>
          </div>
        )}
        {error && (
          <div className="camera-error">
            <p>{error}</p>
          </div>
        )}
      </div>

      <div className="camera-controls">
        {!isStreaming ? (
          <button
            className="camera-button camera-button-start"
            onClick={startCamera}
          >
            Start Camera
          </button>
        ) : (
          <button
            className="camera-button camera-button-stop"
            onClick={stopCamera}
          >
            Stop Camera
          </button>
        )}
      </div>

      {isStreaming && (
        <div className="camera-status">
          <span className="status-indicator"></span>
          <span>Camera is active</span>
        </div>
      )}
    </div>
  );
}

export default Camera;
