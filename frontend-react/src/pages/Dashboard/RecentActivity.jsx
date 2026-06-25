import { relativeDate } from '../../utils/formatters';

export default function RecentActivity({ activity, loading }) {
  return (
    <div className="card h-100">
      <div className="card-header">
        <h6 className="card-title">
          <i className="fas fa-clock-rotate-left me-2 text-primary-custom" />
          Recent Activity
        </h6>
        <span className="text-muted-custom" style={{ fontSize: '0.76rem' }}>Today</span>
      </div>
      <div className="card-body" id="activity-list">
        {loading && <p className="text-muted-custom" style={{ fontSize: '0.85rem' }}>Loading…</p>}
        {!loading && (!activity || activity.length === 0) && (
          <p className="text-muted-custom" style={{ fontSize: '0.85rem' }}>No recent activity.</p>
        )}
        {!loading && activity?.map((item, i) => (
          <div className="activity-item entrance-animate" key={i} style={{ '--enter-delay': `${i * 55}ms` }}>
            <div className="activity-dot" style={{ background: item.color ?? '#6E84A3' }} />
            <div>
              <div className="activity-text">{item.text ?? ''}</div>
              <div className="activity-time">
                {relativeDate(item.timestamp)}
                {item.performedBy && <> · by <strong>{item.performedBy}</strong></>}
                {item.detail && <> · {item.detail}</>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
