"use client";

import { ActivityTypeIcon, type ActivityType } from "./ActivityTypeIcon";

export type Activity = {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown> | null;
  creator?: {
    id: string;
    name?: string | null;
    email: string;
  } | null;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  deal?: {
    id: string;
    title: string;
  } | null;
  client?: {
    id: string;
    name: string;
  } | null;
  job?: {
    id: string;
    title?: string | null;
  } | null;
};

type ActivityItemProps = {
  activity: Activity;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
  showEntityLinks?: boolean;
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityItem({ activity, onEdit, onDelete, showEntityLinks = true }: ActivityItemProps) {
  const creatorName = activity.creator?.name || activity.creator?.email || "Unknown";

  return (
    <div className="group relative flex gap-3 py-3">
      {/* Timeline connector */}
      <div className="absolute left-4 top-12 bottom-0 w-px bg-[var(--border)] group-last:hidden" />

      {/* Icon */}
      <ActivityTypeIcon type={activity.type} size="md" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-[var(--foreground)] truncate">
              {activity.subject}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--muted-foreground)]">
              <span title={formatFullDate(activity.occurredAt)}>
                {formatRelativeTime(activity.occurredAt)}
              </span>
              <span>by {creatorName}</span>
            </div>
          </div>

          {/* Actions */}
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(activity)}
                  className="px-2 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                  aria-label={`Edit activity: ${activity.subject}`}
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(activity)}
                  className="px-2 py-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  aria-label={`Delete activity: ${activity.subject}`}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {activity.description && (
          <p className="mt-1 text-sm text-[var(--muted-foreground)] whitespace-pre-wrap">
            {activity.description}
          </p>
        )}

        {/* Entity links */}
        {showEntityLinks && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {activity.contact && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                {activity.contact.firstName} {activity.contact.lastName}
              </span>
            )}
            {activity.deal && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded">
                {activity.deal.title}
              </span>
            )}
            {activity.client && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded">
                {activity.client.name}
              </span>
            )}
            {activity.job && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs bg-orange-50 text-orange-700 rounded">
                {activity.job.title || `Job ${activity.job.id.slice(0, 8)}`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
