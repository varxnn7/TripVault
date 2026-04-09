import { useState } from 'react';
import './Input.css';

const Input = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  icon,
  required = false,
  disabled = false,
  className = "",
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`input-group ${error ? 'input-error' : ''} ${focused ? 'input-focused' : ''} ${className}`}>
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        {type === "textarea" ? (
          <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className="input-field input-textarea"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={4}
            {...props}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className="input-field"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          />
        )}
      </div>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
};

export default Input;
