import { useCertificateStore } from './certificateStore';
import type { CertificateType } from '@quantract/shared/certificate-types';

/**
 * Get the data from the most recently updated certificate of the given type.
 * Used as the lowest-priority source for applyDefaults.
 */
export function getLastUsedDefaults(
  certType: CertificateType,
): Record<string, unknown> | undefined {
  const certificates = useCertificateStore.getState().certificates;

  const ofType = certificates
    .filter((c) => c.certificate_type === certType)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  if (ofType.length === 0) return undefined;

  return ofType[0].data;
}
