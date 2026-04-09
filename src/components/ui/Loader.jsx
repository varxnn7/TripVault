import './Loader.css';

const Loader = ({ size = "md", fullScreen = false, text }) => {
  if (fullScreen) {
    return (
      <div className="loader-fullscreen">
        <div className="loader-content">
          <div className="loader-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          {text && <p className="loader-text">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`loader loader-${size}`}>
      <div className="loader-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
};

export default Loader;
