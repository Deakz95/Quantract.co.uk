"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Smartphone, Briefcase, Building2, MessageSquare } from "lucide-react";

type Client = {
  id: string;
  name: string;
  email: string;
};

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  isPrimary: boolean;
  preferredChannel: string;
  notes?: string;
  clientId?: string;
  client?: Client;
  createdAt: string;
  updatedAt: string;
};

type ContactCardProps = {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  showActions?: boolean;
  compact?: boolean;
};

const channelLabels: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

function formatDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB");
}

export function ContactCard({ contact, onEdit, onDelete, showActions = true, compact = false }: ContactCardProps) {
  const displayName = `${contact.firstName} ${contact.lastName}`.trim();

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--foreground)] truncate">{displayName}</span>
            {contact.isPrimary && <Badge variant="gradient">Primary</Badge>}
          </div>
          {contact.jobTitle && (
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{contact.jobTitle}</div>
          )}
          {contact.email && (
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{contact.email}</div>
          )}
        </div>
        {showActions && (
          <div className="flex items-center gap-2">
            <Link href={`/admin/contacts/${contact.id}`}>
              <Button variant="secondary" size="sm" type="button">
                View
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>{displayName}</CardTitle>
              {contact.isPrimary && <Badge variant="gradient">Primary</Badge>}
            </div>
            {contact.jobTitle && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                <Briefcase className="h-3.5 w-3.5" />
                {contact.jobTitle}
              </div>
            )}
          </div>
          {showActions && (
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button variant="secondary" type="button" onClick={() => onEdit(contact)}>
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button variant="destructive" type="button" onClick={() => onDelete(contact)}>
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {contact.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
              <a href={`mailto:${contact.email}`} className="text-[var(--primary)] hover:underline">
                {contact.email}
              </a>
            </div>
          )}

          {contact.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-[var(--muted-foreground)]" />
              <a href={`tel:${contact.phone}`} className="text-[var(--foreground)] hover:underline">
                {contact.phone}
              </a>
            </div>
          )}

          {contact.mobile && (
            <div className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4 text-[var(--muted-foreground)]" />
              <a href={`tel:${contact.mobile}`} className="text-[var(--foreground)] hover:underline">
                {contact.mobile}
              </a>
            </div>
          )}

          {contact.client && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-[var(--muted-foreground)]" />
              <Link href={`/admin/clients/${contact.client.id}`} className="text-[var(--primary)] hover:underline">
                {contact.client.name}
              </Link>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span className="text-[var(--muted-foreground)]">
              Preferred: {channelLabels[contact.preferredChannel] || contact.preferredChannel}
            </span>
          </div>

          {contact.notes && (
            <div className="mt-4 rounded-xl bg-[var(--muted)] p-3">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">Notes</div>
              <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{contact.notes}</div>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-[var(--border)] flex justify-between text-xs text-[var(--muted-foreground)]">
            <span>Created: {formatDate(contact.createdAt)}</span>
            <span>Updated: {formatDate(contact.updatedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
