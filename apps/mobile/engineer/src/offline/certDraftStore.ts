/**
 * Certificate draft persistence using AsyncStorage.
 *
 * Stores drafts keyed by certificateId. Each draft contains the certificate
 * data JSON, type, test results, server updatedAt (for conflict detection),
 * and a dirty flag indicating unsynced local changes.
 *
 * AsyncStorage is used instead of SQLite because:
 * - Drafts are small JSON blobs (typically < 50KB each)
 * - No relational queries needed
 * - Matches all existing offline patterns in the app
 * - Avoids adding native module complexity (expo-sqlite)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "qt_cert_draft_v1_";
const INDEX_KEY = "qt_cert_draft_index_v1";

export type CertDraft = {
  certificateId: string;
  type: string;
  data: Record<string, unknown>;
  testResults: Array<{ circuitRef?: string; data: Record<string, unknown> }>;
  /** The server's updatedAtISO when we last fetched/synced — used for conflict detection */
  serverUpdatedAt: string | null;
  /** ISO timestamp of the last local save */
  savedAt: string;
  /** true if local changes have not been synced to the server */
  dirty: boolean;
};

function keyFor(certificateId: string): string {
  return `${KEY_PREFIX}${certificateId}`;
}

/** Load draft index (list of certificateIds with drafts) */
async function loadIndex(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveIndex(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

/** Save a draft to AsyncStorage */
export async function saveDraft(draft: CertDraft): Promise<void> {
  await AsyncStorage.setItem(keyFor(draft.certificateId), JSON.stringify(draft));
  const index = await loadIndex();
  if (!index.includes(draft.certificateId)) {
    index.push(draft.certificateId);
    await saveIndex(index);
  }
}

/** Load a draft by certificateId, or null if not found */
export async function loadDraft(certificateId: string): Promise<CertDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(certificateId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Delete a draft */
export async function deleteDraft(certificateId: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(certificateId));
  const index = await loadIndex();
  await saveIndex(index.filter((id) => id !== certificateId));
}

/** List all draft certificateIds */
export async function listDraftIds(): Promise<string[]> {
  return loadIndex();
}

/** List all drafts */
export async function listDrafts(): Promise<CertDraft[]> {
  const ids = await loadIndex();
  const drafts: CertDraft[] = [];
  for (const id of ids) {
    const draft = await loadDraft(id);
    if (draft) drafts.push(draft);
  }
  return drafts;
}

/** Mark a draft as synced (dirty = false) and update serverUpdatedAt */
export async function markSynced(certificateId: string, serverUpdatedAt: string): Promise<void> {
  const draft = await loadDraft(certificateId);
  if (!draft) return;
  draft.dirty = false;
  draft.serverUpdatedAt = serverUpdatedAt;
  await saveDraft(draft);
}
