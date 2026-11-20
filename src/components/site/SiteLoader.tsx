export default function SiteLoader({ compact = false }) {
  return (
    <span
      className={`site-loader${compact ? " compact" : ""}`}
      role="status"
      aria-label="Yuklanmoqda"
    >
      <span className="site-loader-ring" aria-hidden="true" />
    </span>
  );
}
