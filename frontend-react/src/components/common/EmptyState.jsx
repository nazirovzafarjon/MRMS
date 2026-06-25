export default function EmptyState({ icon = 'fa-inbox', message = 'No records found.', colSpan = 9 }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="empty-state">
          <i className={`fas ${icon}`} />
          <p>{message}</p>
        </div>
      </td>
    </tr>
  );
}
