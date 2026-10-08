export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="manga-panel error-state" role="alert">
      <h2>Signal lost</h2><p>{message}</p>
      {onRetry && <button className="btn-slash" onClick={onRetry}>Try again</button>}
    </div>
  );
}
