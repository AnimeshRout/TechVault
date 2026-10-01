/**
 * Reusable skeleton loader components
 */
export function SkeletonCard() {
  return (
    <div className="product-card" style={{ pointerEvents: 'none' }}>
      <div className="product-card-img-wrapper">
        <div className="skeleton" style={{ width: '100%', height: '100%', position: 'absolute' }} />
      </div>
      <div className="product-card-info">
        <div className="skeleton" style={{ width: '40%', height: 12, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: '90%', height: 16, marginBottom: 4 }} />
        <div className="skeleton" style={{ width: '70%', height: 16, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: '30%', height: 12, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: '50%', height: 20 }} />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonLine({ width = '100%', height = 16, style = {} }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function SkeletonBlock({ width = '100%', height = 200, style = {} }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 'var(--radius-lg)', ...style }} />;
}
