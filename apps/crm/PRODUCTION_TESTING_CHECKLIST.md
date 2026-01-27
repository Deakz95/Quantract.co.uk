# Quantract Production Testing Checklist

## How to Run Automated Audit

Run this command from the `apps/crm` directory:

```bash
cd apps/crm
npm install
npx playwright install chromium
npx playwright test run-production-audit.spec.ts --project=chromium
```

The test will output a comprehensive report of all issues found.

---

## Manual Testing Checklist

Use this checklist to manually verify all functionality on www.quantract.co.uk

### Authentication
- [ ] Login page loads correctly
- [ ] Email input field works
- [ ] Password input field works
- [ ] "Sign in" button works
- [ ] Login with correct credentials succeeds
- [ ] Login with incorrect credentials shows error
- [ ] Logout functionality works
- [ ] Session persists on page refresh
- [ ] Password reset flow works

### Admin Dashboard (`/admin`)
- [ ] Dashboard loads without errors
- [ ] Stats/metrics cards display correctly
- [ ] Recent activity shows
- [ ] Quick action buttons work
- [ ] Navigation sidebar works
- [ ] All navigation links are clickable
- [ ] Mobile menu works on small screens

### Quotes Module (`/admin/quotes`)
- [ ] Quotes list loads
- [ ] Search/filter works
- [ ] Pagination works
- [ ] "New Quote" button works
- [ ] Quote detail page loads
- [ ] Edit quote works
- [ ] Add line items works
- [ ] Remove line items works
- [ ] VAT calculation is correct
- [ ] Total calculation is correct
- [ ] "Send to Client" works
- [ ] "Generate PDF" works
- [ ] PDF downloads correctly
- [ ] "Convert to Job" works
- [ ] Quote status updates correctly
- [ ] Delete quote works (if applicable)

### Jobs Module (`/admin/jobs`)
- [ ] Jobs list loads
- [ ] Search/filter works
- [ ] Pagination works
- [ ] Job detail page loads
- [ ] "Details" tab works
- [ ] "Costing" tab works
  - [ ] Add cost items works
  - [ ] Edit cost items works
  - [ ] Delete cost items works
  - [ ] Margin calculation is correct
- [ ] "Timesheets" tab works
- [ ] "Materials" tab works
- [ ] "Documents" tab works
- [ ] "Variations" tab works
- [ ] Assign engineer works
- [ ] Update job status works
- [ ] Complete job works

### Clients Module (`/admin/clients`)
- [ ] Clients list loads
- [ ] Search works
- [ ] "Add Client" button works
- [ ] Client form validates properly
- [ ] Create client works
- [ ] Client detail page loads
- [ ] Edit client works
- [ ] Client history shows quotes/jobs/invoices
- [ ] Delete client works (if applicable)

### Engineers Module (`/admin/engineers`)
- [ ] Engineers list loads
- [ ] "Add Engineer" button works
- [ ] Create engineer works
- [ ] Engineer detail page loads
- [ ] Edit engineer works
- [ ] Assign/unassign from jobs works
- [ ] View engineer schedule works
- [ ] Delete engineer works (if applicable)

### Invoices Module (`/admin/invoices`)
- [ ] Invoices list loads
- [ ] Search/filter works
- [ ] Pagination works
- [ ] Invoice detail page loads
- [ ] Invoice amounts are correct
- [ ] "Download PDF" works
- [ ] PDF is correctly formatted
- [ ] Mark as paid works
- [ ] Send to client works

### Timesheets Module (`/admin/timesheets`)
- [ ] Timesheets list loads
- [ ] Filter by engineer works
- [ ] Filter by week works
- [ ] Timesheet detail loads
- [ ] Approve timesheet works
- [ ] Reject timesheet works
- [ ] Hours calculation is correct

### Enquiries Module (`/admin/enquiries`)
- [ ] Enquiries page loads
- [ ] Kanban board displays (or list view)
- [ ] "Add Enquiry" button works
- [ ] Create enquiry works
- [ ] Drag and drop between stages works
- [ ] Enquiry detail page loads
- [ ] Convert to quote works
- [ ] Edit enquiry works
- [ ] Delete enquiry works

### Settings Pages
- [ ] `/admin/settings` - Main settings page loads
- [ ] `/admin/settings/account` - Company details save correctly
- [ ] `/admin/settings/security` - User management works
- [ ] `/admin/settings/notifications` - Email settings save
- [ ] `/admin/settings/pdf` - PDF branding settings work
- [ ] `/admin/settings/appearance` - Theme settings work
- [ ] `/admin/settings/service-lines` - Add/edit/delete service lines
- [ ] `/admin/settings/legal-entities` - Multi-entity configuration
- [ ] `/admin/settings/lead-capture` - Lead form settings work

### Reports (`/admin/reports`)
- [ ] Reports page loads
- [ ] Profitability report works
- [ ] Revenue report works
- [ ] Date filters work
- [ ] Export functionality works

### Other Admin Pages
- [ ] `/admin/tasks` - Tasks page loads
- [ ] `/admin/checklists` - Checklists page loads
- [ ] `/admin/certificates` - Certificates page loads
- [ ] `/admin/schedule` - Schedule view loads
- [ ] `/admin/materials` - Materials/inventory page loads
- [ ] `/admin/expenses` - Expenses page loads
- [ ] `/admin/variations` - Variations page loads

### Client Portal
- [ ] Client can access quote via token link
- [ ] Quote details display correctly
- [ ] "Accept Quote" button works
- [ ] Agreement signing works
- [ ] Signature capture works
- [ ] Client can view invoices
- [ ] Client can download invoice PDFs
- [ ] Client portal login works
- [ ] Client dashboard loads

### Engineer Portal
- [ ] Engineer login works
- [ ] Dashboard loads
- [ ] Assigned jobs display
- [ ] Job detail page works
- [ ] Submit timesheet works
- [ ] Add time entries works
- [ ] Certificate filling works
- [ ] Profile page works

### Mobile Responsiveness
- [ ] Login page responsive
- [ ] Admin dashboard responsive
- [ ] Tables scroll horizontally on mobile
- [ ] Navigation works on mobile
- [ ] Forms usable on mobile
- [ ] Modals display correctly on mobile

### Console Errors (F12 > Console)
- [ ] No JavaScript errors on login
- [ ] No JavaScript errors on dashboard
- [ ] No JavaScript errors on quotes pages
- [ ] No JavaScript errors on jobs pages
- [ ] No JavaScript errors on settings pages
- [ ] No network 4xx/5xx errors

### Performance
- [ ] Pages load within 3 seconds
- [ ] No excessive loading spinners
- [ ] No frozen/unresponsive UI
- [ ] Form submissions respond quickly

---

## Issue Tracking Template

When you find an issue, document it like this:

```
### Issue: [Brief description]
- **Page:** [URL path]
- **Severity:** Critical / High / Medium / Low
- **Type:** UI / UX / Broken / API / Console Error
- **Steps to Reproduce:**
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
- **Expected:** [What should happen]
- **Actual:** [What actually happens]
- **Screenshot:** [If applicable]
- **Console Errors:** [If any]
```

---

## Known Issues to Check

Based on common patterns, specifically check:

1. **Modal dialogs** - Do they open/close properly?
2. **Form validation** - Are error messages clear?
3. **Date pickers** - Do they work on all browsers?
4. **File uploads** - Do they work for documents/images?
5. **PDF generation** - Do PDFs open correctly?
6. **Email sending** - Do emails actually send?
7. **Calculations** - Are VAT/totals correct?
8. **Pagination** - Does "next page" work?
9. **Search** - Does clearing search reset results?
10. **Delete confirmations** - Are there safety prompts?
