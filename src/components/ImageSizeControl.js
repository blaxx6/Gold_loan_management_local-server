import React from 'react';

// Defines the dimensions for the icons based on the selected size.
const sizeStyles = {
  small: { width: 18, height: 18 },
  medium: { width: 28, height: 28 },
  large: { width: 38, height: 38 }
};

// Data for the size options, including labels and icons.
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
    {/* Label for the control, styled for a dark theme */}
    <label className="control-label" style={{ fontWeight: 600, marginBottom: 4, color: '#eee' }}>
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
      {/* Map through the size options to create a button for each */}
      {sizeOptions.map(option => (
        <button
          key={option.value}
          className={`size-option${currentSize === option.value ? ' active' : ''}`}
          onClick={() => onSizeChange(option.value)}
          title={option.label}
          style={{
            // --- STYLES CORRECTED FOR DARK THEME & TRANSPARENCY ---
            background: currentSize === option.value ? 'rgba(0, 123, 255, 0.2)' : 'transparent',
            border: currentSize === option.value ? '2px solid #007bff' : '1px solid #555',
            color: '#fff', // White text for readability on dark backgrounds
            // --- END OF CORRECTIONS ---
            borderRadius: 8,
            padding: '8px 16px',
            minWidth: 80,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: currentSize === option.value ? 700 : 400,
            boxShadow: currentSize === option.value ? '0 2px 8px rgba(0,123,255,0.1)' : 'none',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
        >
          {/* Icon for the button */}
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
          {/* Label text for the button */}
          {option.label}
        </button>
      ))}
    </div>
    {/* Embedded CSS for responsive behavior and hover effects */}
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
      /* Added a hover effect for better user experience */
      .size-option:not(.active):hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: #777;
      }
    `}</style>
  </div>
);

export default ImageSizeControl;
