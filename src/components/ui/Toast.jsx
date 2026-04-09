import { IoCheckmarkCircle, IoAlertCircle, IoInformationCircle, IoWarning, IoClose } from 'react-icons/io5';
import { useToast } from '../../contexts/ToastContext';
import './Toast.css';

const icons = {
  success: <IoCheckmarkCircle />,
  error: <IoAlertCircle />,
  info: <IoInformationCircle />,
  warning: <IoWarning />,
};

const Toast = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type} animate-fade-in-up`}>
          <span className="toast-icon">{icons[toast.type] || icons.info}</span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <IoClose />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
