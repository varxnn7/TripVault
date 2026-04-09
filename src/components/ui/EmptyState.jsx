import './EmptyState.css';

const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="empty-state animate-fade-in">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-desc">{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
