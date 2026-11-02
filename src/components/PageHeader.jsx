export default function PageHeader({ icon, title, sub }) {
  return (
    <div className="py-4">
      <h2 className="fw-bold mb-1">
        {icon && <i className={`bi bi-${icon} me-2`} />}{title}
      </h2>
      {sub && <p className="text-secondary mb-0">{sub}</p>}
    </div>
  )
}
