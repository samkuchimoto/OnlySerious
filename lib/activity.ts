// /lib/activity.ts
// ThaiFriendly's freshness-bucket pattern: a coarse, honest label instead
// of a live-ticking clock. Real data only — lastActiveAt is set by
// app/browse's own page load (see its useEffect), never fabricated.

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export interface ActivityStatus {
  label: string;
  isOnline: boolean;
}

export function getActivityStatus(lastActiveAt?: string): ActivityStatus | null {
  if (!lastActiveAt) return null;
  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  if (diffMs < 0) return null;
  if (diffMs < ONLINE_WINDOW_MS) return { label: "Online now", isOnline: true };

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) return { label: `Active ${minutes} min ago`, isOnline: false };
  if (hours < 24) return { label: `Active ${hours}h ago`, isOnline: false };
  if (days < 30) return { label: `Active ${days}d ago`, isOnline: false };
  return { label: "Active over a month ago", isOnline: false };
}

// 14 days, matching ThaiFriendly's grid "NEW" badge window — long enough
// to matter for slow early growth, short enough to stay meaningful.
const NEW_MEMBER_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function isNewMember(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < NEW_MEMBER_WINDOW_MS;
}
