export default function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{icon && <span style={{ marginRight: 6 }}>{icon}</span>}{label}</div>
      <div className="stat-number">{value ?? '—'}</div>
    </div>
  )
}
