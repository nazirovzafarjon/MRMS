import { getInitials, avatarColor } from '../../utils/formatters';

export default function Avatar({ name, size = 'table', className = '' }) {
  const initials = getInitials(name);
  const color    = avatarColor(name);

  if (size === 'profile') {
    return (
      <div className={`profile-avatar ${className}`}>{initials}</div>
    );
  }

  return (
    <div className={`table-avatar avatar-${color} ${className}`}>{initials}</div>
  );
}
