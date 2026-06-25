import { useCountUp } from '../../hooks/useCountUp';

const CARD_CONFIG = {
  blue:   { iconCls: 'fa-user-doctor',         label: 'Total Doctors',   trend: '2 this month',    trendDir: 'up' },
  green:  { iconCls: 'fa-hospital-user',        label: 'Total Patients',  trend: '5 this week',     trendDir: 'up' },
  orange: { iconCls: 'fa-file-medical',         label: 'Diagnoses',       trend: '3 new today',     trendDir: 'up' },
  red:    { iconCls: 'fa-triangle-exclamation', label: 'Critical Cases',  trend: 'Needs attention', trendDir: 'down' },
};

export default function StatCard({ color, value, icon, label }) {
  const cfg      = CARD_CONFIG[color];
  const animated = useCountUp(value ?? 0);
  const iconCls  = icon  || cfg.iconCls;
  const cardLabel = label || cfg.label;

  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon"><i className={`fas ${iconCls}`} /></div>
      <div className="stat-info">
        <div className="stat-label">{cardLabel}</div>
        <div className="stat-value">{value === undefined ? '—' : animated}</div>
        <div className={`stat-trend${cfg.trendDir === 'down' ? ' down' : ''}`}>
          <i className={`fas fa-arrow-${cfg.trendDir}`} /> {cfg.trend}
        </div>
      </div>
    </div>
  );
}
