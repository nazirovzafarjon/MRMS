const STATUS_MAP = {
  // Patient status
  stable:     'badge-stable',
  monitoring: 'badge-monitoring',
  critical:   'badge-critical',
  recovered:  'badge-recovered',
  inactive:   'badge-inactive',
  // Doctor status
  active:     'badge-active',
  // Diagnosis status
  resolved:   'badge-recovered',
  // Disease request status
  pending:    'badge-monitoring',
  approved:   'badge-active',
  rejected:   'badge-critical',
};

export default function StatusBadge({ value, children }) {
  const label = children || (value ? value.charAt(0).toUpperCase() + value.slice(1) : '—');
  const cls   = STATUS_MAP[value] || 'badge-inactive';
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

// Medical condition badge — values: "Under Monitoring" | "Critical" | "Recovered"
export function ConditionBadge({ value }) {
  const CONDITION_MAP = {
    'Under Monitoring': 'badge-monitoring',  // amber
    'Critical':         'badge-critical',    // red
    'Recovered':        'badge-recovered',   // green
  };
  const cls = CONDITION_MAP[value] || 'badge-inactive';
  return <span className={`status-badge ${cls}`}>{value || '—'}</span>;
}

// Diagnosis severity badge — values: Low | Medium | High | Critical
export function SeverityBadge({ value }) {
  const SEVERITY_MAP = {
    'Low':      'badge-stable',
    'Medium':   'badge-monitoring',
    'High':     'badge-critical',
    'Critical': 'badge-critical',
    // legacy values kept for backward compatibility
    mild:     'badge-stable',
    moderate: 'badge-monitoring',
    severe:   'badge-critical',
  };
  const label = value || '—';
  const cls   = SEVERITY_MAP[value] || 'badge-inactive';
  return <span className={`status-badge ${cls}`}>{label}</span>;
}
