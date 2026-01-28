# Quantract AI Assistants

## Overview

Quantract has two AI assistants with strict scope separation:

1. **Marketing Site Assistant** (`Quantract Help`) - Public-facing, answers pricing/features questions
2. **CRM Assistant** (`Quantract Assistant`) - In-app, authenticated, handles account/workflow questions

## Architecture

### File Locations

**Marketing Site (apps/marketing):**
- `app/api/ai/chat/route.ts` - Chat endpoint with rate limiting
- `src/components/ChatWidget.tsx` - Floating chat widget

**CRM App (apps/crm):**
- `app/api/ai/chat/route.ts` - Existing chat endpoint (unchanged)
- `src/lib/ai/prompts/marketing.ts` - Marketing system prompt
- `src/lib/ai/prompts/crm.ts` - CRM system prompts (by role)
- `src/lib/ai/routing.ts` - Routing logic and intent detection
- `src/lib/ai/prompts.ts` - Re-exports for backward compatibility

### Environment Detection

The assistant type is determined by:

1. **Environment** (`marketing_site` | `crm_app`)
2. **Authentication state** (`isAuthenticated: boolean`)
3. **Intent keywords** (fallback detection)

**Rules:**
- Marketing site → Always marketing assistant
- CRM app + authenticated → CRM assistant
- Unauthenticated → Marketing assistant
- Environment wins over intent (prevents takeover)

### Widget Labels

| Context | Title | Subtitle |
|---------|-------|----------|
| Marketing Site | Quantract Help | Pricing & Product Help |
| CRM App | Quantract Assistant | Admin Assistant |

## Configuration

### Environment Variables

Both apps use:
```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # optional, defaults to gpt-4o-mini
```

---

## Manual QA Test Plan

### Test 1: CRM Intent on Marketing Site
**Location:** www.quantract.co.uk (marketing site)
**Query:** "Which invoices are overdue?"
**Expected:** Redirect message - "I don't have access to account data..."
**Pass Criteria:**
- [ ] No hallucinated invoice data
- [ ] Shows link to sign in to CRM
- [ ] Response clearly states limitation

### Test 2: Pricing Question on CRM
**Location:** crm.quantract.co.uk (logged in as admin)
**Query:** "How much is the Team plan?" or "What's the pricing?"
**Expected:** Brief factual answer + return to task
**Pass Criteria:**
- [ ] States correct pricing info
- [ ] Links to Settings > Billing
- [ ] Follows up with "anything else I can help with in the CRM?"
- [ ] No sales pitch or upselling language

### Test 3: Product Question on Marketing Site
**Location:** www.quantract.co.uk (marketing site)
**Query:** "What does Quantract do?"
**Expected:** Clear product explanation + trial CTA
**Pass Criteria:**
- [ ] Explains key features (quotes, jobs, invoices, certificates)
- [ ] Mentions target audience (UK electrical contractors)
- [ ] Suggests starting free trial
- [ ] Uses British English

### Test 4: Workflow Question on CRM
**Location:** crm.quantract.co.uk (logged in as admin)
**Query:** "Create a quote for..." or "Which jobs are blocked?"
**Expected:** Workflow guidance using actual data
**Pass Criteria:**
- [ ] References real data from the account
- [ ] Provides actionable guidance
- [ ] Citations use correct UUIDs
- [ ] No marketing language

### Test 5: Account Data on Marketing Site
**Location:** www.quantract.co.uk (marketing site)
**Query:** "Show my certificates" or "What's my job status?"
**Expected:** Redirect to CRM
**Pass Criteria:**
- [ ] Does NOT invent any data
- [ ] Clear redirect message
- [ ] Provides CRM sign-in URL

### Test 6: Feature Question on Marketing Site
**Location:** www.quantract.co.uk (marketing site)
**Query:** "Can I create EICR certificates?"
**Expected:** Yes, explains certificate feature
**Pass Criteria:**
- [ ] Confirms EICR capability
- [ ] Mentions BS 7671 compliance
- [ ] May suggest trial

---

## Rate Limiting

**Marketing endpoint:** 10 requests/minute per IP
**CRM endpoint:** Uses existing auth-based limits

---

## Security Notes

1. Marketing assistant has NO access to any user data
2. CRM assistant respects role-based access (admin/engineer/client)
3. All requests are logged for audit
4. Rate limiting prevents abuse
5. Intent detection prevents scope takeover
