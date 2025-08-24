import React, { useState } from 'react';

const GoldImageViewer = ({ images, onClose, displaySize = 'medium' }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [viewerMode, setViewerMode] = useState('fit'); // 'fit', 'fill', 'actual'

  if (!images || images.length === 0) {
    return null;
  }

  const currentImage = images[selectedImageIndex];

  const getSizeStyles = () => {
    const sizeMap = {
      small: { maxWidth: '400px', maxHeight: '300px' },
      medium: { maxWidth: '600px', maxHeight: '500px' },
      large: { maxWidth: '800px', maxHeight: '700px' }
    };

    const modeMap = {
      fit: { objectFit: 'contain' },
      fill: { objectFit: 'cover' },
      actual: { objectFit: 'none', maxWidth: 'none', maxHeight: 'none' }
    };

    return {
      ...sizeMap[displaySize],
      ...modeMap[viewerMode]
    };
  };

  const getThumbnailSize = () => {
    const sizeMap = {
      small: { width: '40px', height: '40px' },
      medium: { width: '60px', height: '60px' },
      large: { width: '80px', height: '80px' }
    };
    return sizeMap[displaySize];
  };

  const handlePrevious = () => {
    setSelectedImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
  };

  const handleNext = () => {
    setSelectedImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
  };

  const handleDownload = (image) => {
    const link = document.createElement('a');
    link.href = image.data;
    link.download = image.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
        <div className="image-viewer-header">
          <div className="viewer-controls">
            <button 
              className={`btn-secondary ${viewerMode === 'fit' ? 'active' : ''}`}
              onClick={() => setViewerMode('fit')}
            >
              Fit
            </button>
            <button 
              className={`btn-secondary ${viewerMode === 'fill' ? 'active' : ''}`}
              onClick={() => setViewerMode('fill')}
            >
              Fill
            </button>
            <button 
              className={`btn-secondary ${viewerMode === 'actual' ? 'active' : ''}`}
              onClick={() => setViewerMode('actual')}
            >
              Actual Size
            </button>
          </div>
          <button onClick={onClose} className="btn-danger">Close</button>
        </div>

        <div className="image-viewer-main">
          <button 
            onClick={handlePrevious}
            className="nav-button nav-prev"
            disabled={images.length <= 1}
          >
            ←
          </button>

          <div className="main-image-container">
            <img 
              src={currentImage.data}
              alt={currentImage.name}
              style={getSizeStyles()}
              className="main-image"
            />
          </div>

          <button 
            onClick={handleNext}
            className="nav-button nav-next"
            disabled={images.length <= 1}
          >
            →
          </button>
        </div>

        <div className="image-info">
          <div className="image-details">
            <p><strong>Name:</strong> {currentImage.name}</p>
            <p><strong>Size:</strong> {(currentImage.size / 1024 / 1024).toFixed(2)} MB</p>
            <p><strong>Type:</strong> {currentImage.type}</p>
            <p><strong>Uploaded:</strong> {new Date(currentImage.uploadDate).toLocaleString()}</p>
          </div>
          <button 
            onClick={() => handleDownload(currentImage)}
            className="btn-primary"
          >
            Download
          </button>
        </div>

        {images.length > 1 && (
          <div className="thumbnail-strip">
            {images.map((image, index) => (
              <img
                key={index}
                src={image.data}
                alt={image.name}
                className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                onClick={() => setSelectedImageIndex(index)}
                style={getThumbnailSize()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoldImageViewer;
