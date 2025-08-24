import React from 'react';

const sizeStyles = {
  small: { width: 18, height: 18 },
  medium: { width: 28, height: 28 },
  large: { width: 38, height: 38 }
};

const sizeOptions = [
  { value: 'small', label: 'Small', icon: '🔵' },
  { value: 'medium', label: 'Medium', icon: '🔵' },
  { value: 'large', label: 'Large', icon: '🔵' }
];

const ImageSizeControl = ({ currentSize, onSizeChange }) => (
  <div
    className="image-size-control"
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      alignItems: 'flex-start',
      width: '100%'
    }}
  >
    <label className="control-label" style={{ fontWeight: 600, marginBottom: 4 }}>
      Image Size:
    </label>
    <div
      className="size-options"
      style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap'
      }}
    >
      {sizeOptions.map(option => (
        <button
          key={option.value}
          className={`size-option${currentSize === option.value ? ' active' : ''}`}
          onClick={() => onSizeChange(option.value)}
          title={option.label}
          style={{
            border: currentSize === option.value ? '2px solid #007bff' : '1px solid #ccc',
            background: currentSize === option.value ? '#e6f0ff' : '#fff',
            color: '#222',
            borderRadius: 8,
            padding: '8px 16px',
            minWidth: 80,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: currentSize === option.value ? 700 : 400,
            boxShadow: currentSize === option.value ? '0 2px 8px rgba(0,123,255,0.08)' : 'none',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
        >
          <span
            className="size-icon"
            style={{
              display: 'inline-block',
              ...sizeStyles[option.value],
              fontSize: sizeStyles[option.value].width,
              marginRight: 6
            }}
          >
            {option.icon}
          </span>
          {option.label}
        </button>
      ))}
    </div>
    <style>{`
      @media (max-width: 600px) {
        .image-size-control .size-options {
          flex-direction: column;
          gap: 8px;
        }
        .image-size-control label {
          font-size: 1rem;
        }
      }
      .size-option.active {
        outline: none;
      }
      .size-option:focus {
        border-color: #0056b3;
      }
    `}</style>
  </div>
);

export default ImageSizeControl;