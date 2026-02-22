interface CachedConfigBannerProps {
  timestamp: number;
  onRetry: () => void;
}

function getRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function CachedConfigBanner({ timestamp, onRetry }: CachedConfigBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm shadow-md">
      <span>
        Using cached config from {getRelativeTime(timestamp)} — config server is unreachable.
      </span>
      <button
        onClick={onRetry}
        className="ml-4 underline hover:no-underline font-medium"
      >
        Retry
      </button>
    </div>
  );
}
