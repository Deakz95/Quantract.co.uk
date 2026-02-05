declare module "next/link" {
  const Link: any;
  export default Link;
}

declare module "next" {
  export type Metadata = Record<string, any>;
  export type NextConfig = Record<string, any>;
}

declare module "next/navigation" {
  export const useRouter: () => any;
  export const useParams: <T extends Record<string, string | string[] | undefined> = Record<string, string | string[] | undefined>>() => T;
  export const usePathname: () => string;
  export const useSearchParams: () => any;
  export const notFound: () => never;
  export const redirect: (url: string) => never;
}

declare module "next/headers" {
  export const cookies: () => any;
}

declare module "next/server" {
  export const NextResponse: any;
  export const NextRequest: any;
  export type NextRequest = any;
}

declare module "bcryptjs" {
  export const hash: any;
  export const compare: any;
}

declare module "lucide-react" {
  export const AlertTriangle: any;
  export const ArrowRight: any;
  export const BadgeCheck: any;
  export const Briefcase: any;
  export const Calendar: any;
  export const CalendarDays: any;
  export const CheckCircle: any;
  export const ChevronLeft: any;
  export const ChevronRight: any;
  export const ChevronUp: any;
  export const Clock: any;
  export const Download: any;
  export const FileText: any;
  export const HelpCircle: any;
  export const Info: any;
  export const LayoutDashboard: any;
  export const Loader2: any;
  export const Lock: any;
  export const Mail: any;
  export const Menu: any;
  export const Plus: any;
  export const Receipt: any;
  export const RefreshCcw: any;
  export const Send: any;
  export const Settings: any;
  export const UploadCloud: any;
  export const User: any;
  export const Users: any;
  export const X: any;
  export const Zap: any;
  export const Sparkles: any;
  export const ArrowLeft: any;
  export const CheckCircle2: any;
  export const AlertCircle: any;
  export const TrendingUp: any;
  export const ArrowUpRight: any;
  export const Shield: any;
  export const BarChart3: any;
  export const Check: any;
  export const Palette: any;
  export const RefreshCw: any;
  export const Inbox: any;
}

declare module "clsx" {
  export type ClassValue = any;
  export const clsx: (...inputs: ClassValue[]) => string;
  export default clsx;
}

declare module "tailwind-merge" {
  export const twMerge: (...classes: any[]) => string;
  const merge: (...classes: any[]) => string;
  export { merge };
  export default merge;
}

declare module "vitest" {
  export const describe: any;
  export const it: any;
  export const expect: any;
}

declare module "pdf-lib" {
  export const PDFDocument: any;
  export const StandardFonts: any;
  const pdfLib: any;
  export = pdfLib;
}

declare module "@prisma/client" {
  class PrismaClient {
    constructor(...args: any[]);
    [key: string]: any;
  }
  export { PrismaClient };
  export type Prisma = any;
}

declare module "stripe" {
  class Stripe {
    constructor(...args: any[]);
    [key: string]: any;
  }
  export default Stripe;
}

declare module "tailwindcss" {
  export type Config = any;
  const tailwindcss: any;
  export default tailwindcss;
}

declare module "@neondatabase/auth/next/server" {
  export const neonAuth: () => Promise<{ user: any }>;
  export const createNeonAuth: (config: any) => any;
  export const createAuthServer: (config?: any) => any;
  export const authApiHandler: (config: any) => any;
  export type NeonAuth = any;
}

declare module "ioredis" {
  class IORedis {
    constructor(url?: string, options?: any);
    [key: string]: any;
  }
  export default IORedis;
}
