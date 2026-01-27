import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { Mail, Phone, Smartphone, Briefcase, Building2, MessageSquare, Calendar, Clock } from "lucide-react";

const channelLabels: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

function formatDate(date?: Date | string | null) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date?: Date | string | null) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  params: Promise<{ contactId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContactDetailPage({ params }: Props) {
  const { contactId } = await params;

  const authCtx = await getAuthContext();
  if (!authCtx || authCtx.role !== "admin" || !authCtx.companyId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)]">You do not have permission to view this page.</p>
        </CardContent>
      </Card>
    );
  }

  const client = getPrisma();
  if (!client) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)]">Database service is currently unavailable.</p>
        </CardContent>
      </Card>
    );
  }

  const contact = await client.contact.findFirst({
    where: { id: contactId, companyId: authCtx.companyId },
    include: {
      client: {
        select: { id: true, name: true, email: true, phone: true },
      },
      deals: {
        select: {
          id: true,
          title: true,
          value: true,
          stage: { select: { name: true, color: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      activities: {
        select: {
          id: true,
          type: true,
          subject: true,
          occurredAt: true,
          notes: true,
        },
        orderBy: { occurredAt: "desc" },
        take: 10,
      },
    },
  });

  if (!contact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/admin/contacts" className="text-sm font-semibold text-[var(--muted-foreground)] underline">
            Back to contacts
          </Link>
        </CardContent>
      </Card>
    );
  }

  const displayName = `${contact.firstName} ${contact.lastName}`.trim();

  const breadcrumbItems = [
    { label: "Dashboard", href: "/admin" },
    { label: "Contacts", href: "/admin/contacts" },
    { label: displayName },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle>{displayName}</CardTitle>
                {contact.isPrimary && <Badge variant="gradient">Primary Contact</Badge>}
              </div>
              {contact.jobTitle && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                  <Briefcase className="h-4 w-4" />
                  {contact.jobTitle}
                </div>
              )}
              {contact.client && (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                  <Building2 className="h-4 w-4" />
                  <Link href={`/admin/clients/${contact.client.id}`} className="text-[var(--primary)] hover:underline">
                    {contact.client.name}
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link href="/admin/contacts">
                <Button variant="secondary" type="button">
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contact.email && (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--muted)]">
                    <Mail className="h-5 w-5 text-[var(--muted-foreground)]" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">Email</div>
                    <a href={`mailto:${contact.email}`} className="text-sm text-[var(--primary)] hover:underline">
                      {contact.email}
                    </a>
                  </div>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--muted)]">
                    <Phone className="h-5 w-5 text-[var(--muted-foreground)]" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">Phone</div>
                    <a href={`tel:${contact.phone}`} className="text-sm text-[var(--foreground)] hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                </div>
              )}

              {contact.mobile && (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--muted)]">
                    <Smartphone className="h-5 w-5 text-[var(--muted-foreground)]" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">Mobile</div>
                    <a href={`tel:${contact.mobile}`} className="text-sm text-[var(--foreground)] hover:underline">
                      {contact.mobile}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--muted)]">
                  <MessageSquare className="h-5 w-5 text-[var(--muted-foreground)]" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--muted-foreground)]">Preferred Contact</div>
                  <div className="text-sm text-[var(--foreground)]">
                    {channelLabels[contact.preferredChannel] || contact.preferredChannel}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <div>
                    <div className="text-xs text-[var(--muted-foreground)]">Created</div>
                    <div className="text-sm text-[var(--foreground)]">{formatDate(contact.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <div>
                    <div className="text-xs text-[var(--muted-foreground)]">Updated</div>
                    <div className="text-sm text-[var(--foreground)]">{formatDate(contact.updatedAt)}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {contact.notes ? (
              <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{contact.notes}</div>
            ) : (
              <div className="text-sm text-[var(--muted-foreground)]">No notes for this contact.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deals */}
      <Card>
        <CardHeader>
          <CardTitle>Deals</CardTitle>
        </CardHeader>
        <CardContent>
          {contact.deals.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">No deals associated with this contact.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--muted-foreground)]">
                    <th className="py-2">Title</th>
                    <th className="py-2">Stage</th>
                    <th className="py-2">Value</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {contact.deals.map((deal: { id: string; title: string; value: number | null; stage: { name: string; color: string | null } | null; createdAt: Date }) => (
                    <tr key={deal.id} className="border-t border-[var(--border)]">
                      <td className="py-3">
                        <div className="font-semibold text-[var(--foreground)]">{deal.title}</div>
                      </td>
                      <td className="py-3">
                        {deal.stage ? (
                          <Badge
                            style={{
                              backgroundColor: deal.stage.color || undefined,
                            }}
                          >
                            {deal.stage.name}
                          </Badge>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">-</span>
                        )}
                      </td>
                      <td className="py-3 text-[var(--foreground)]">
                        {deal.value != null
                          ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(deal.value))
                          : "-"}
                      </td>
                      <td className="py-3 text-[var(--muted-foreground)]">{formatDate(deal.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {contact.activities.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">No activities recorded for this contact.</div>
          ) : (
            <div className="space-y-3">
              {contact.activities.map((activity: { id: string; type: string; subject: string; occurredAt: Date; notes: string | null }) => (
                <div key={activity.id} className="rounded-xl border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{activity.type}</Badge>
                      <span className="font-semibold text-[var(--foreground)]">{activity.subject}</span>
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">{formatDateTime(activity.occurredAt)}</span>
                  </div>
                  {activity.notes && (
                    <div className="mt-2 text-sm text-[var(--muted-foreground)]">{activity.notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
