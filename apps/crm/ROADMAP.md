# Development Roadmap

**Status Legend:**
- `TODO` - Not started
- `IN_PROGRESS` - Currently being worked on
- `DONE` - Completed successfully
- `FAILED` - Gates failed (see notes for details)

---

## Phase 00: Runner Baseline
**Status:** DONE
**Spec:** stages/phase-00-runner-baseline.md
**Goal:** Implement Phase Runner v1 with automated quality gates

---

## Phase 17A: Conversation Persistence (Backend)
**Status:** IN_PROGRESS
**Spec:** stages/phase-17a-conversation-persistence-backend.md
**Goal:** Move conversation CRUD from frontend to backend with Prisma

---

## Phase 17B: Message Persistence (Backend)
**Status:** TODO
**Spec:** stages/phase-17b-message-persistence-backend.md
**Goal:** Backend-owned message storage with full history

---

## Phase 17C: Prisma Migration for Conversations
**Status:** TODO
**Spec:** stages/phase-17c-prisma-conversations.md
**Goal:** Migrate in-memory storage to PostgreSQL

---

## Phase 17D: Memory Search and Embeddings
**Status:** TODO
**Spec:** stages/phase-17d-memory-embeddings.md
**Goal:** Enhance memory retrieval with embedding-based search

---

## Phase 18A: Dataset Ingestion Tool
**Status:** TODO
**Spec:** stages/phase-18a-dataset-ingestion.md
**Goal:** Bulk load regulations from markdown/JSON

---

## Phase 18B: Dataset Retrieval Integration
**Status:** TODO
**Spec:** stages/phase-18b-dataset-integration.md
**Goal:** Wire dataset retrieval into message flow

---

## Phase 19A: E2E Test Hardening
**Status:** TODO
**Spec:** stages/phase-19a-e2e-hardening.md
**Goal:** Fix all failing E2E tests

---

## Phase 20A: CRM Foundation
**Status:** TODO
**Spec:** stages/phase-20a-crm-foundation.md
**Goal:** Add CRM data models (Contacts, Companies, Deals)

---

## Phase 20B: CRM API Layer
**Status:** TODO
**Spec:** stages/phase-20b-crm-api.md
**Goal:** RESTful CRUD endpoints for CRM entities

---

## Phase 20C: CRM Frontend
**Status:** TODO
**Spec:** stages/phase-20c-crm-frontend.md
**Goal:** UI for managing contacts, companies, deals

---

## Notes

- Each phase must have a corresponding spec in `/stages`
- Runner automatically updates this file
- Phases run in strict order
- Failed phases must be fixed before continuing
