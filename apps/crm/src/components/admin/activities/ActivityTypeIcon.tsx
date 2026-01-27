"use client";

import { MessageSquare, Phone, Mail, Calendar, CheckSquare, ArrowRight, LucideIcon } from "lucide-react";

export type ActivityType = "NOTE" | "CALL" | "EMAIL" | "MEETING" | "TASK" | "STAGE_CHANGE";

const iconMap: Record<ActivityType, LucideIcon> = {
  NOTE: MessageSquare,
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  TASK: CheckSquare,
  STAGE_CHANGE: ArrowRight,
};

const colorMap: Record<ActivityType, string> = {
  NOTE: "text-blue-500 bg-blue-100",
  CALL: "text-green-500 bg-green-100",
  EMAIL: "text-purple-500 bg-purple-100",
  MEETING: "text-orange-500 bg-orange-100",
  TASK: "text-cyan-500 bg-cyan-100",
  STAGE_CHANGE: "text-gray-500 bg-gray-100",
};

const labelMap: Record<ActivityType, string> = {
  NOTE: "Note",
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  TASK: "Task",
  STAGE_CHANGE: "Stage Change",
};

type ActivityTypeIconProps = {
  type: ActivityType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export function ActivityTypeIcon({ type, size = "md", showLabel = false, className = "" }: ActivityTypeIconProps) {
  const Icon = iconMap[type] || MessageSquare;
  const colorClasses = colorMap[type] || "text-gray-500 bg-gray-100";
  const label = labelMap[type] || type;

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center justify-center rounded-full ${sizeClasses[size]} ${colorClasses}`}
      >
        <Icon size={iconSizes[size]} />
      </div>
      {showLabel && (
        <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      )}
    </div>
  );
}

export function getActivityTypeLabel(type: ActivityType): string {
  return labelMap[type] || type;
}
