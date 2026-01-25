'use client';

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, Briefcase, TrendingUp, Clock, ArrowUpRight, Zap, Settings, Menu, X, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type WidgetType = 'stats' | 'quickActions' | 'recentActivity' | 'teamOverview' | 'performance' | 'calendar' | 'invoiceChart' | 'jobsMap';

type Widget = {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  size: 'small' | 'medium' | 'large' | 'full';
};

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'stats', type: 'stats', title: 'Stats Overview', description: 'Key business metrics', size: 'full' },
  { id: 'quickActions', type: 'quickActions', title: 'Quick Actions', description: 'Frequently used actions', size: 'full' },
  { id: 'recentActivity', type: 'recentActivity', title: 'Recent Activity', description: 'Latest business activity', size: 'medium' },
  { id: 'teamOverview', type: 'teamOverview', title: 'Team Overview', description: 'Team member status', size: 'medium' },
  { id: 'performance', type: 'performance', title: 'Performance Banner', description: 'Business performance summary', size: 'full' },
];

const AVAILABLE_WIDGETS: Widget[] = [
  ...DEFAULT_WIDGETS,
  { id: 'calendar', type: 'calendar', title: 'Calendar', description: 'Upcoming appointments', size: 'medium' },
  { id: 'invoiceChart', type: 'invoiceChart', title: 'Invoice Chart', description: 'Monthly invoice breakdown', size: 'medium' },
  { id: 'jobsMap', type: 'jobsMap', title: 'Jobs Map', description: 'Geographic job distribution', size: 'large' },
];

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

// Widget Components
function StatsWidget() {
  return (
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
  );
}

function QuickActionsWidget() {
  return (
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
  );
}

function RecentActivityWidget() {
  return (
    <Card className="h-full">
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
  );
}

function TeamOverviewWidget() {
  return (
    <Card className="h-full">
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
  );
}

function PerformanceWidget() {
  return (
    <Card className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white border-0">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Your business is growing!</h3>
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
  );
}

function CalendarWidget() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Upcoming Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { title: "Site inspection - 42 Oak Lane", time: "Today, 2:00 PM", type: "inspection" },
            { title: "Client meeting - Smith residence", time: "Tomorrow, 10:00 AM", type: "meeting" },
            { title: "Installation - 15 High Street", time: "Wed, 9:00 AM", type: "job" },
          ].map((event, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--muted)]">
              <div className="w-2 h-full min-h-[40px] rounded-full bg-[var(--primary)]" />
              <div>
                <div className="text-sm font-medium">{event.title}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{event.time}</div>
              </div>
            </div>
          ))}
        </div>
        <Link href="/admin/schedule" className="block mt-4">
          <Button variant="outline" size="sm" className="w-full">View Full Schedule</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function InvoiceChartWidget() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Invoice Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--muted-foreground)]">Paid</span>
            <span className="text-sm font-semibold text-[var(--success)]">£8,450</span>
          </div>
          <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--success)] rounded-full" style={{ width: '72%' }} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--muted-foreground)]">Pending</span>
            <span className="text-sm font-semibold text-[var(--warning)]">£3,250</span>
          </div>
          <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--warning)] rounded-full" style={{ width: '28%' }} />
          </div>
          <div className="pt-4 border-t border-[var(--border)]">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total This Month</span>
              <span className="text-lg font-bold">£11,700</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function JobsMapWidget() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Job Locations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-[var(--muted)] rounded-xl flex items-center justify-center">
          <div className="text-center text-[var(--muted-foreground)]">
            <div className="text-4xl mb-2">🗺️</div>
            <p className="text-sm">Map integration coming soon</p>
            <p className="text-xs mt-1">View all job locations at a glance</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-[var(--muted)] rounded-lg">
            <div className="text-lg font-bold">3</div>
            <div className="text-xs text-[var(--muted-foreground)]">Active</div>
          </div>
          <div className="p-2 bg-[var(--muted)] rounded-lg">
            <div className="text-lg font-bold">5</div>
            <div className="text-xs text-[var(--muted-foreground)]">Scheduled</div>
          </div>
          <div className="p-2 bg-[var(--muted)] rounded-lg">
            <div className="text-lg font-bold">12</div>
            <div className="text-xs text-[var(--muted-foreground)]">Completed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function renderWidget(widget: Widget) {
  switch (widget.type) {
    case 'stats': return <StatsWidget />;
    case 'quickActions': return <QuickActionsWidget />;
    case 'recentActivity': return <RecentActivityWidget />;
    case 'teamOverview': return <TeamOverviewWidget />;
    case 'performance': return <PerformanceWidget />;
    case 'calendar': return <CalendarWidget />;
    case 'invoiceChart': return <InvoiceChartWidget />;
    case 'jobsMap': return <JobsMapWidget />;
    default: return null;
  }
}

function getWidgetClassName(size: Widget['size']) {
  switch (size) {
    case 'small': return 'col-span-1';
    case 'medium': return 'col-span-1 lg:col-span-1';
    case 'large': return 'col-span-1 lg:col-span-2';
    case 'full': return 'col-span-1 lg:col-span-2';
    default: return 'col-span-1';
  }
}

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Load saved layout from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate the saved widgets exist in AVAILABLE_WIDGETS
        const validWidgets = parsed.filter((w: Widget) =>
          AVAILABLE_WIDGETS.some(aw => aw.id === w.id)
        );
        if (validWidgets.length > 0) {
          setWidgets(validWidgets);
        }
      } catch {
        // Use defaults if parsing fails
      }
    }
  }, []);

  // Save layout to localStorage
  const saveLayout = (newWidgets: Widget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('dashboard-widgets', JSON.stringify(newWidgets));
  };

  const moveWidget = (fromIndex: number, toIndex: number) => {
    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, removed);
    saveLayout(newWidgets);
  };

  const removeWidget = (id: string) => {
    const newWidgets = widgets.filter(w => w.id !== id);
    saveLayout(newWidgets);
  };

  const addWidget = (widget: Widget) => {
    if (!widgets.some(w => w.id === widget.id)) {
      saveLayout([...widgets, widget]);
    }
    setShowAddWidget(false);
  };

  const resetToDefault = () => {
    saveLayout(DEFAULT_WIDGETS);
    setIsCustomizing(false);
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetId) return;

    const fromIndex = widgets.findIndex(w => w.id === draggedWidget);
    const toIndex = widgets.findIndex(w => w.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      moveWidget(fromIndex, toIndex);
    }
    setDraggedWidget(null);
  };

  const availableToAdd = AVAILABLE_WIDGETS.filter(aw => !widgets.some(w => w.id === aw.id));

  return (
    <AppShell role="admin" title="Dashboard" subtitle="Overview of your business performance and recent activity.">
      <div className="space-y-6">
        {/* Customize Controls */}
        <div className="flex items-center justify-end gap-2">
          {isCustomizing ? (
            <>
              <Button variant="outline" size="sm" onClick={resetToDefault}>
                Reset to Default
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAddWidget(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Widget
              </Button>
              <Button variant="gradient" size="sm" onClick={() => setIsCustomizing(false)}>
                Done
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setIsCustomizing(true)}>
              <Settings className="w-4 h-4 mr-1" />
              Customize Dashboard
            </Button>
          )}
        </div>

        {/* Add Widget Modal */}
        {showAddWidget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAddWidget(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl animate-fade-in">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Add Widget</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddWidget(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {availableToAdd.length === 0 ? (
                  <p className="text-[var(--muted-foreground)] text-center py-8">All available widgets are already on your dashboard.</p>
                ) : (
                  <div className="space-y-2">
                    {availableToAdd.map((widget) => (
                      <button
                        key={widget.id}
                        onClick={() => addWidget(widget)}
                        className="w-full p-4 text-left rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--muted)] transition-colors"
                      >
                        <div className="font-medium">{widget.title}</div>
                        <div className="text-sm text-[var(--muted-foreground)]">{widget.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className={`${getWidgetClassName(widget.size)} ${isCustomizing ? 'relative group' : ''} ${draggedWidget === widget.id ? 'opacity-50' : ''}`}
              draggable={isCustomizing}
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, widget.id)}
            >
              {isCustomizing && (
                <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                  <button
                    className="w-8 h-8 rounded-full bg-[var(--card)] border border-[var(--border)] shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-[var(--muted)]"
                    title="Drag to reorder"
                  >
                    <Menu className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </button>
                  <button
                    onClick={() => removeWidget(widget.id)}
                    className="w-8 h-8 rounded-full bg-[var(--destructive)] text-white shadow-lg flex items-center justify-center hover:opacity-90"
                    title="Remove widget"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {isCustomizing && (
                <div className="absolute inset-0 border-2 border-dashed border-[var(--primary)] rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              {renderWidget(widget)}
            </div>
          ))}
        </div>

        {widgets.length === 0 && (
          <div className="text-center py-12 bg-[var(--muted)] rounded-2xl">
            <p className="text-[var(--muted-foreground)]">No widgets on your dashboard.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAddWidget(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Your First Widget
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
