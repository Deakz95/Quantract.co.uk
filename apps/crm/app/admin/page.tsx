import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Receipt, Briefcase, TrendingUp, Clock, Users, ArrowUpRight, Zap } from "lucide-react";
import Link from "next/link";

const stats = [
  {
    label: "Open Quotes",
    value: "4",
    change: "+2 this week",
    icon: FileText,
    color: "from-blue-500 to-blue-600",
    href: "/admin/quotes",
  },
  {
    label: "Unpaid Invoices",
    value: "2",
    change: "£3,250 pending",
    icon: Receipt,
    color: "from-amber-500 to-orange-500",
    href: "/admin/invoices",
  },
  {
    label: "Active Jobs",
    value: "3",
    change: "On schedule",
    icon: Briefcase,
    color: "from-emerald-500 to-teal-500",
    href: "/admin/jobs",
  },
  {
    label: "This Month",
    value: "£12.4k",
    change: "+18% vs last month",
    icon: TrendingUp,
    color: "from-violet-500 to-purple-500",
    href: "/admin/reports/profitability",
  },
];

const quickActions = [
  { label: "Create Quote", href: "/admin/quotes/new", icon: FileText },
  { label: "New Invoice", href: "/admin/invoices/new", icon: Receipt },
  { label: "Add Job", href: "/admin/jobs/new", icon: Briefcase },
  { label: "View Schedule", href: "/admin/schedule", icon: Clock },
];

const recentActivity = [
  { type: "quote", title: "Quote #Q-2024-0042 sent", time: "2 hours ago", status: "pending" },
  { type: "invoice", title: "Invoice #INV-0018 paid", time: "5 hours ago", status: "success" },
  { type: "job", title: "Job at 123 Main St completed", time: "Yesterday", status: "success" },
  { type: "quote", title: "Quote #Q-2024-0041 accepted", time: "2 days ago", status: "success" },
];

export default function AdminHome() {
  return (
    <AppShell role="admin" title="Dashboard" subtitle="Overview of your business performance and recent activity.">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card variant="interactive" className="group h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-[var(--foreground)]">{stat.value}</div>
                    <div className="text-sm font-medium text-[var(--foreground)] mt-1">{stat.label}</div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1">{stat.change}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[var(--primary)]" />
              <CardTitle>Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--muted)] transition-all duration-200 text-center group">
                    <action.icon className="w-6 h-6 mx-auto text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
                    <div className="mt-2 text-sm font-medium text-[var(--foreground)]">{action.label}</div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Badge variant="secondary">Last 7 days</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--muted)] transition-colors">
                    <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--foreground)] truncate">{item.title}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{item.time}</div>
                    </div>
                    <Badge variant={item.status === 'success' ? 'success' : 'warning'} className="text-xs">
                      {item.status === 'success' ? 'Done' : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Overview</CardTitle>
                <Link href="/admin/engineers">
                  <Badge variant="outline" className="cursor-pointer hover:bg-[var(--muted)]">
                    View All <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Badge>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "John Smith", role: "Lead Engineer", jobs: 3, status: "active" },
                  { name: "Sarah Johnson", role: "Electrician", jobs: 2, status: "active" },
                  { name: "Mike Williams", role: "Apprentice", jobs: 1, status: "break" },
                ].map((member, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--muted)] transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-semibold text-sm">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--foreground)]">{member.name}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{member.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-[var(--foreground)]">{member.jobs} jobs</div>
                      <Badge variant={member.status === 'active' ? 'success' : 'secondary'} className="text-xs">
                        {member.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Banner */}
        <Card className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white border-0">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Your business is growing! 🚀</h3>
                <p className="text-white/80 text-sm mt-1">Revenue is up 18% compared to last month. Keep up the great work!</p>
              </div>
              <Link href="/admin/reports/profitability">
                <button className="px-6 py-2.5 bg-white text-[var(--primary)] rounded-xl font-semibold hover:bg-white/90 transition-colors">
                  View Reports
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
