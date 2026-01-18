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
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });
      setPreviewStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error starting preview:', error);
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
            {previewStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-preview-video"
              />
            ) : (
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
