export default function Loader({ label = 'Loading' }) {
  return <div className="loader" role="status" aria-label={label}><span /><span /><span /></div>;
}
