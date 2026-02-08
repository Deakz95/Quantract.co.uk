"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  useCertificateStore,
  useStoreHydration,
  CertificateStatus,
  CertificateType,
  STATUS_LABELS,
  TYPE_LABELS,
} from "../../lib/certificateStore";

export default function DashboardPage() {
  const hydrated = useStoreHydration();
  const { certificates, deleteCertificate } = useCertificateStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CertificateStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<CertificateType | "all">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filter certificates
  const filteredCertificates = useMemo(() => {
    return certificates.filter((cert) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        cert.certificate_number?.toLowerCase().includes(searchLower) ||
        cert.client_name?.toLowerCase().includes(searchLower) ||
        cert.client_address?.toLowerCase().includes(searchLower) ||
        cert.installation_address?.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === "all" || cert.status === statusFilter;
      const matchesType = typeFilter === "all" || cert.certificate_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [certificates, searchTerm, statusFilter, typeFilter]);

  // Stats
  const stats = {
    total: certificates.length,
    draft: certificates.filter((c) => c.status === "draft" || c.status === "in_progress").length,
    complete: certificates.filter((c) => c.status === "complete").length,
    issued: certificates.filter((c) => c.status === "issued").length,
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const handleDelete = (id: string) => {
    deleteCertificate(id);
    setDeleteConfirm(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status: CertificateStatus) => {
    switch (status) {
      case "issued":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "complete":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in_progress":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getTypeColor = (type: CertificateType) => {
    switch (type) {
      case "EIC":
      case "EICR":
      case "MWC":
        return "text-[var(--primary)]";
      case "FIRE":
      case "EML":
        return "text-red-400";
      default:
        return "text-[var(--muted-foreground)]";
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Background grid - must be behind content with negative z-index */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -1,
          backgroundImage:
            "linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative z-[1] py-8 px-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/"
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold">My Certificates</h1>
            </div>
            <p className="text-[var(--muted-foreground)]">
              Manage your saved electrical certificates (stored locally in your browser)
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white rounded-sm font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Certificate
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Certificates", value: stats.total, color: "from-[var(--primary)] to-[var(--accent)]" },
            { label: "In Progress", value: stats.draft, color: "from-amber-500 to-orange-500" },
            { label: "Ready to Issue", value: stats.complete, color: "from-green-500 to-emerald-500" },
            { label: "Issued", value: stats.issued, color: "from-blue-500 to-cyan-500" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[var(--card)] border border-[var(--border)] rounded p-5 relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`} />
              <div className="text-3xl font-bold font-mono">{stat.value}</div>
              <div className="text-sm text-[var(--muted-foreground)] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by certificate number, client, or address..."
                className="w-full px-4 py-3 pl-12 bg-[var(--background)] border border-[var(--border)] rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--muted)] rounded-sm transition-colors"
                >
                  <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CertificateStatus | "all")}
              className="px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-w-[160px]"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
              <option value="issued">Issued</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as CertificateType | "all")}
              className="px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-w-[160px]"
            >
              <option value="all">All Types</option>
              <option value="EIC">EIC</option>
              <option value="EICR">EICR</option>
              <option value="MWC">MWC</option>
              <option value="FIRE">Fire Alarm</option>
              <option value="EML">Emergency Lighting</option>
            </select>

            {/* Clear Filters */}
            {(searchTerm || statusFilter !== "all" || typeFilter !== "all") && (
              <button
                onClick={clearFilters}
                className="px-4 py-3 bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-sm text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-sm text-[var(--muted-foreground)]">
              Showing {filteredCertificates.length} of {certificates.length} certificates
            </span>
          </div>

          {certificates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No certificates yet</h3>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Create your first certificate to get started. All certificates are saved locally in your browser.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white rounded-sm font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Certificate
              </Link>
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No certificates found</h3>
              <p className="text-[var(--muted-foreground)] mb-6">
                Try adjusting your search or filters
              </p>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-sm text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filteredCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center gap-4 p-4 hover:bg-[var(--muted)]/50 transition-colors group"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-sm bg-[var(--muted)] flex items-center justify-center shrink-0">
                    <svg className={`w-6 h-6 ${getTypeColor(cert.certificate_type)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{cert.certificate_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(cert.status)}`}>
                        {STATUS_LABELS[cert.status]}
                      </span>
                      <span className={`text-xs font-medium ${getTypeColor(cert.certificate_type)}`}>
                        {cert.certificate_type}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--muted-foreground)] mt-1 truncate">
                      {cert.client_name || cert.installation_address || TYPE_LABELS[cert.certificate_type]}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1">
                      Updated {formatDate(cert.updated_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/${cert.certificate_type.toLowerCase()}?id=${cert.id}`}
                      className="p-2 hover:bg-[var(--primary)]/10 text-[var(--primary)] rounded-sm transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    {deleteConfirm === cert.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(cert.id)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-sm hover:bg-red-500/30 transition-colors"
                          title="Confirm Delete"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-2 hover:bg-[var(--muted)] rounded-sm transition-colors"
                          title="Cancel"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(cert.id)}
                        className="p-2 hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 rounded-sm transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Chevron */}
                  <Link
                    href={`/${cert.certificate_type.toLowerCase()}?id=${cert.id}`}
                    className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-6 p-4 bg-[var(--muted)]/50 border border-[var(--border)] rounded-sm text-sm text-[var(--muted-foreground)]">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-[var(--foreground)]">Local Storage</p>
              <p className="mt-1">
                Your certificates are saved in your browser&apos;s local storage. They will persist until you clear your browser data.
                For cloud storage and team features, upgrade to{" "}
                <a href="https://www.quantract.co.uk/auth/signup" className="text-[var(--primary)] hover:underline">
                  Quantract CRM
                </a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
