import { useState, useEffect, useRef } from 'react';
import './CameraSelector.css';

function CameraSelector({ isOpen, onClose, onSelect, selectedCameraId }) {
  const [cameras, setCameras] = useState([]);
  const [selectedId, setSelectedId] = useState(selectedCameraId || '');
  const [previewStream, setPreviewStream] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      enumerateCameras();
    }
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const enumerateCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedId) {
        setSelectedId(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error enumerating cameras:', error);
    }
  };

  const startPreview = async (deviceId) => {
    // Stop previous stream
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setPreviewStream(stream);
      
      // Wait for video element to be ready, then set stream and play
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Explicitly call play() - required on Windows
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.error('Error playing video:', playError);
          // On Windows, sometimes we need to wait a bit
          setTimeout(async () => {
            if (videoRef.current && videoRef.current.srcObject === stream) {
              try {
                await videoRef.current.play();
              } catch (retryError) {
                console.error('Retry play failed:', retryError);
              }
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error starting preview:', error);
      setPreviewStream(null);
    }
  };

  useEffect(() => {
    if (selectedId && isOpen) {
      startPreview(selectedId);
    }
  }, [selectedId, isOpen]);

  const handleCameraChange = (e) => {
    const newId = e.target.value;
    setSelectedId(newId);
  };

  const handleConfirm = () => {
    onSelect(selectedId);
    onClose();
  };

  const handleCancel = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="camera-selector-overlay" onClick={handleCancel}>
      <div className="camera-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="camera-selector-header">
          <h2 className="camera-selector-title">Choose Camera</h2>
          <button className="camera-selector-close" onClick={handleCancel}>×</button>
        </div>
        
        <div className="camera-selector-content">
          <div className="camera-preview-area">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-preview-video"
              style={{ display: previewStream ? 'block' : 'none' }}
            />
            {!previewStream && (
              <div className="camera-preview-placeholder">
                <span>PREVIEW</span>
              </div>
            )}
          </div>

          <div className="camera-selector-controls">
            <div className="camera-instruction">
              Make sure your upper body is relatively visible!
            </div>
            
            <div className="camera-dropdown-container">
              <select
                className="camera-dropdown"
                value={selectedId}
                onChange={handleCameraChange}
              >
                {cameras.length === 0 && (
                  <option value="">No cameras found</option>
                )}
                {cameras.map(camera => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="camera-selector-buttons">
              <button className="camera-button-secondary" onClick={handleCancel}>
                Cancel
              </button>
              <button className="camera-button-primary" onClick={handleConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CameraSelector;
