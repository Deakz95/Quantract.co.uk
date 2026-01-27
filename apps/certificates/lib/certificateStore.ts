import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CertificateStatus = 'draft' | 'in_progress' | 'complete' | 'issued';
export type CertificateType = 'EIC' | 'EICR' | 'MWC' | 'FIRE' | 'EML';

export interface StoredCertificate {
  id: string;
  certificate_number: string;
  certificate_type: CertificateType;
  status: CertificateStatus;
  client_name?: string;
  client_address?: string;
  installation_address?: string;
  created_at: string;
  updated_at: string;
  data: Record<string, unknown>;
}

interface CertificateStore {
  certificates: StoredCertificate[];
  addCertificate: (cert: StoredCertificate) => void;
  updateCertificate: (id: string, data: Partial<StoredCertificate>) => void;
  deleteCertificate: (id: string) => void;
  getCertificate: (id: string) => StoredCertificate | undefined;
}

export const useCertificateStore = create<CertificateStore>()(
  persist(
    (set, get) => ({
      certificates: [],

      addCertificate: (cert) =>
        set((state) => ({
          certificates: [cert, ...state.certificates],
        })),

      updateCertificate: (id, data) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? { ...c, ...data, updated_at: new Date().toISOString() }
              : c
          ),
        })),

      deleteCertificate: (id) =>
        set((state) => ({
          certificates: state.certificates.filter((c) => c.id !== id),
        })),

      getCertificate: (id) => get().certificates.find((c) => c.id === id),
    }),
    {
      name: 'quantract-certificates-storage',
    }
  )
);

// Helper to generate certificate number
export function generateCertificateNumber(type: CertificateType): string {
  const prefix = type;
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${random}`;
}

// Helper to create a new certificate
export function createNewCertificate(
  type: CertificateType,
  initialData: Record<string, unknown> = {}
): StoredCertificate {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    certificate_number: generateCertificateNumber(type),
    certificate_type: type,
    status: 'draft',
    created_at: now,
    updated_at: now,
    data: initialData,
  };
}

// Status labels
export const STATUS_LABELS: Record<CertificateStatus, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  complete: 'Complete',
  issued: 'Issued',
};

// Type labels
export const TYPE_LABELS: Record<CertificateType, string> = {
  EIC: 'Electrical Installation Certificate',
  EICR: 'Electrical Installation Condition Report',
  MWC: 'Minor Works Certificate',
  FIRE: 'Fire Alarm Certificate',
  EML: 'Emergency Lighting Certificate',
};
