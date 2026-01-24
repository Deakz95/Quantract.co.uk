# SMS Notification Status

## Decision: SMS NOT SUPPORTED

**Date:** 2026-01-21
**Status:** ❌ NOT IMPLEMENTED

---

## Summary

SMS notifications are **NOT supported** in Quantract Web Portal. This is an explicit architectural decision documented for Stage 0 security hardening.

---

## Rationale

1. **Cost Considerations**
   - SMS delivery costs scale linearly with volume
   - UK SMS costs approximately £0.04-0.08 per message
   - Email is zero-cost via Resend

2. **Limited Use Case**
   - Most critical notifications (quotes, invoices, certificates) require document viewing
   - Email with PDF attachments is more appropriate for B2B
   - No emergency/time-critical alerts requiring SMS

3. **Complexity**
   - Requires third-party provider (Twilio, AWS SNS)
   - Phone number validation and international formatting
   - Opt-in/opt-out compliance (GDPR, UK PECR)
   - Additional security surface (SIM swap attacks, phone number enumeration)

4. **User Base**
   - Primary users: admins, engineers, clients (all business users)
   - Business users check email regularly
   - Mobile app notifications (future) are better suited for real-time alerts

---

## Implementation Status

### ✅ **What IS Implemented**

- **Schema Support**: Database has `NotificationPreference` model with `channel: "sms"` field
- **Preference Management**: `canSendSms()` function exists in `/src/lib/server/notifications.ts`
- **Future-Ready**: Schema allows SMS enablement without migration

### ❌ **What is NOT Implemented**

- No SMS provider integration (no Twilio/AWS SNS)
- No phone number field in User model
- No phone number validation
- No SMS sending functions
- No SMS templates
- No rate limiting for SMS (not needed)

---

## How SMS Appears to Users

### Admin UI
- Notification preferences page: SMS toggle **disabled** with tooltip: "SMS notifications not available"
- Settings: No SMS configuration section

### Client/Engineer UI
- No phone number input field in profile
- No SMS preference toggles

### API
- `/api/notifications/preferences` endpoint: Returns SMS preferences as `enabled: false` (hardcoded)
- SMS preferences cannot be changed (read-only)

---

## Future SMS Enablement Path

If SMS is required in the future, follow these steps:

### 1. **Add Phone Number Field**
```prisma
model User {
  phone            String?
  phoneVerified    Boolean @default(false)
  phoneVerifiedAt  DateTime?
}
```

### 2. **Integrate SMS Provider**
```bash
npm install twilio
```

```typescript
// src/lib/server/sms.ts
import twilio from 'twilio';

export async function sendSms(to: string, message: string) {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  await client.messages.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: message,
  });
}
```

### 3. **Add SMS Templates**
- Invoice payment reminder
- Job schedule changes
- Critical system alerts

### 4. **Update Notification System**
- Enable SMS channel in defaults
- Add phone verification flow
- Implement SMS-specific rate limiting (stricter than email)

### 5. **Compliance**
- Add SMS opt-in consent flow
- Add unsubscribe link in every SMS
- Log SMS delivery for audit

### 6. **Estimated Effort**
- Schema changes: 1 hour
- Provider integration: 4 hours
- Templates + preferences: 4 hours
- Testing + compliance: 8 hours
- **Total: ~17 hours (2-3 days)**

---

## Alternatives to SMS

### Current
- ✅ **Email** - Primary notification channel
- ✅ **In-app notifications** (future) - Real-time alerts via WebSocket
- ✅ **Push notifications** (future) - Mobile app via Firebase/APNS

### Recommended
- **Slack/Teams Integration** - Better for business comms than SMS
- **WhatsApp Business API** - More engagement than SMS in UK market

---

## Questions?

**Q: Can clients request SMS notifications?**
A: No. SMS is architecturally disabled. Direct clients to email or future mobile app.

**Q: What if we need emergency alerts?**
A: Use email + in-app push notifications. For genuine emergencies, phone calls are more appropriate.

**Q: Is this permanent?**
A: No. This is a Stage 0 decision to avoid scope creep. Re-evaluate in Stage 2+ based on customer demand.

---

## Related Documentation

- [Notification Preferences](/src/lib/server/notifications.ts)
- [Email System](/src/lib/server/email.ts)
- [Security Questionnaire](/docs/SECURITY_QUESTIONNAIRE.md)

---

**Status:** 🟢 DOCUMENTED & EXPLICIT
**Last Updated:** 2026-01-21
