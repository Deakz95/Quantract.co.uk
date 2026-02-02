// Type augmentation for lucide-react icons that TypeScript can't resolve
// This works around a moduleResolution issue with bundler mode

declare module "lucide-react" {
  import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";

  type SVGAttributes = Partial<SVGProps<SVGSVGElement>>;
  type ElementAttributes = RefAttributes<SVGSVGElement> & SVGAttributes;

  interface LucideProps extends ElementAttributes {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;

  // Icons used in the codebase
  export const Phone: LucideIcon;
  export const Smartphone: LucideIcon;
  export const Building2: LucideIcon;
  export const Building: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const DollarSign: LucideIcon;
  export const PoundSterling: LucideIcon;
  export const Percent: LucideIcon;
  export const Activity: LucideIcon;
  export const CheckSquare: LucideIcon;
  export const GitBranch: LucideIcon;
  export const FileBarChart: LucideIcon;
  export const Target: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Award: LucideIcon;
  export const Trash2: LucideIcon;
  export const GripVertical: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const XCircle: LucideIcon;
  export const Upload: LucideIcon;
  export const Download: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const CircleUser: LucideIcon;
  export const LogOut: LucideIcon;
  export const Filter: LucideIcon;
  export const Search: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const RefreshCcw: LucideIcon;
  export const ExternalLink: LucideIcon;

  // Re-export icons that already work
  export const Mail: LucideIcon;
  export const Calendar: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const User: LucideIcon;
  export const Users: LucideIcon;
  export const Plus: LucideIcon;
  export const X: LucideIcon;
  export const Settings: LucideIcon;
  export const Box: LucideIcon;
  export const Briefcase: LucideIcon;
  export const Clock: LucideIcon;
  export const FileText: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const Receipt: LucideIcon;
  export const CalendarDays: LucideIcon;
  export const Menu: LucideIcon;
  export const Sparkles: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const Inbox: LucideIcon;
  export const BadgeCheck: LucideIcon;
  export const Check: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Palette: LucideIcon;
  export const Info: LucideIcon;
  export const Zap: LucideIcon;
  export const Lock: LucideIcon;
  export const HelpCircle: LucideIcon;

  // Icons for skeleton loading and DataTable
  export const SquarePen: LucideIcon;
  export const Copy: LucideIcon;
  export const Ellipsis: LucideIcon;
  export const UserCog: LucideIcon;
  export const KeyRound: LucideIcon;
}
