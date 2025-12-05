# Public Quote Portal - Implementerings Plan

## 📋 Oversigt

Dette dokument beskriver planen for at implementere en public quote portal, hvor kunder kan:
- Se tilbud via et unikt og sikkert link (i stedet for PDF vedhæftning)
- Downloade tilbuddet som PDF
- Acceptere eller afvise tilbuddet med kommentar
- Tracking af kundens interaktioner (åbnet, downloadet, accepteret/afvist)

---

## 🎯 Mål og Krav

### Funktionelle Krav
1. **Email med Link**: Når et tilbud sendes, skal emailen indeholde et link til en public side (ikke PDF vedhæftning)
2. **Sikker Link**: Hvert link skal være unikt og sikkert (token-baseret)
3. **PDF Download**: Kunder skal kunne downloade tilbuddet som PDF fra public siden (brug eksisterende PDF layout)
4. **Tracking**: Systemet skal tracke:
   - Når tilbuddet åbnes (first view)
   - Når PDF downloades
   - Når tilbuddet accepteres/afvises
   - Timestamp for hver event
5. **Accept/Reject**: Kunder skal kunne:
   - Acceptere tilbuddet direkte i portalen
   - Afvise tilbuddet med en valgfri kommentar
   - Se status af deres handling

### Tekniske Krav
- Public route skal være udenfor authentication (ikke beskyttet)
- Link skal være unikt per quote og email recipient
- Token skal have expiration (valgfrit, men anbefalet)
- Tracking skal være asynkron og ikke blokere UI
- Accept/reject skal opdatere quote status i databasen

---

## 🏗️ Arkitektur

### Database Schema

#### 1. `quote_public_tokens` Table
```sql
CREATE TABLE IF NOT EXISTS public.quote_public_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE, -- Secure random token
  recipient_email text NOT NULL, -- Email address link was sent to
  expires_at timestamptz, -- Optional expiration
  created_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz, -- Last time token was used
  access_count int NOT NULL DEFAULT 0 -- Number of times accessed
);

CREATE INDEX idx_quote_tokens_token ON public.quote_public_tokens(token);
CREATE INDEX idx_quote_tokens_quote ON public.quote_public_tokens(quote_id);
```

**RLS Policies:**
- Public tokens skal være tilgængelige uden authentication (SELECT)
- Kun authenticated users kan oprette tokens (INSERT)
- Kun authenticated users kan se tokens for deres quotes (SELECT med authentication)

#### 2. `quote_tracking` Table
```sql
CREATE TABLE IF NOT EXISTS public.quote_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  token_id uuid REFERENCES public.quote_public_tokens(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'viewed', 'downloaded', 'accepted', 'rejected'
  ip_address text, -- Optional: for analytics
  user_agent text, -- Optional: browser info
  metadata jsonb, -- Additional data (e.g., rejection comment)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_tracking_quote ON public.quote_tracking(quote_id);
CREATE INDEX idx_quote_tracking_token ON public.quote_tracking(token_id);
CREATE INDEX idx_quote_tracking_event ON public.quote_tracking(event_type);
```

**RLS Policies:**
- Public kan indsætte tracking events (INSERT)
- Authenticated users kan se tracking for deres quotes (SELECT)

#### 3. `quote_responses` Table (eller udvid `quotes` table)
```sql
-- Option A: Separate table
CREATE TABLE IF NOT EXISTS public.quote_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  token_id uuid REFERENCES public.quote_public_tokens(id) ON DELETE SET NULL,
  response_type text NOT NULL CHECK (response_type IN ('accepted', 'rejected')),
  comment text, -- Optional comment from customer
  responded_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

CREATE UNIQUE INDEX idx_quote_responses_quote ON public.quote_responses(quote_id);
CREATE INDEX idx_quote_responses_token ON public.quote_responses(token_id);

-- Option B: Add columns to quotes table
-- ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS public_response_type text;
-- ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS public_response_comment text;
-- ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS public_responded_at timestamptz;
```

**Anbefaling:** Option A (separate table) for bedre historik og mulighed for flere responses.

**RLS Policies:**
- Public kan indsætte responses (INSERT)
- Authenticated users kan se responses (SELECT)

---

## 🔄 Flow Diagram

### Send Quote Email Flow
```
User clicks "Send Quote"
  ↓
Generate secure token for quote + recipient_email
  ↓
Create quote_public_tokens record
  ↓
Generate public URL: https://app.domain.com/quote/{token}
  ↓
Send email with link (NO PDF attachment)
  ↓
Update quote status to 'sent'
  ↓
Log email_sent activity
```

### Customer Views Quote Flow
```
Customer clicks link in email
  ↓
Navigate to /quote/{token}
  ↓
Validate token (exists, not expired, quote exists)
  ↓
Record 'viewed' event in quote_tracking
  ↓
Update quote_public_tokens.last_accessed_at and access_count
  ↓
Render public quote view (read-only)
```

### Customer Downloads PDF Flow
```
Customer clicks "Download PDF" on public page
  ↓
Generate PDF (same as current implementation)
  ↓
Record 'downloaded' event in quote_tracking
  ↓
Return PDF to customer
```

### Customer Accepts/Rejects Quote Flow
```
Customer clicks "Accept" or "Reject"
  ↓
If Reject: Show comment input (optional)
  ↓
Validate response
  ↓
Insert into quote_responses table
  ↓
Update quote status:
  - Accept → 'accepted'
  - Reject → 'declined'
  ↓
Record 'accepted' or 'rejected' event in quote_tracking
  ↓
Show confirmation message to customer
  ↓
(Optional) Send notification email to sales team
```

---

## 📁 Filstruktur

### Nye Filer
```
src/
├── pages/
│   └── public/
│       └── PublicQuoteView.tsx          # Public quote view page
├── components/
│   └── quotes/
│       ├── PublicQuoteViewer.tsx        # Main public quote component
│       ├── QuoteAcceptRejectForm.tsx    # Accept/reject form
│       └── QuoteTrackingBadge.tsx      # Show tracking status (for internal use)
├── services/
│   ├── quotePublicTokens.ts            # Token generation & validation
│   ├── quoteTracking.ts                # Tracking events
│   └── quoteResponses.ts               # Accept/reject handling
├── lib/
│   └── quotePublicUrl.ts               # URL generation helper
└── routes/
    └── publicRoutes.tsx                # Public route definitions

supabase/
└── migrations/
    ├── YYYYMMDD_create_quote_public_tokens.sql
    ├── YYYYMMDD_create_quote_tracking.sql
    └── YYYYMMDD_create_quote_responses.sql

netlify/
└── functions/
    └── track-quote-event/              # Optional: serverless tracking endpoint
        └── index.js
```

### Opdaterede Filer
```
src/
├── services/
│   └── email.ts                        # Update sendQuoteEmail to generate token & link
├── components/
│   └── quotes/
│       └── SendQuoteDialog.tsx        # Update to show link instead of PDF attachment
└── App.tsx                             # Add public routes

netlify/
└── functions/
    └── send-quote/
        └── index.js                    # Update to NOT attach PDF, include link instead
```

---

## 🔧 Implementation Steps

### Fase 1: Database Setup
1. **Create migrations:**
   - `quote_public_tokens` table
   - `quote_tracking` table
   - `quote_responses` table
   - RLS policies for alle tables
   - Indexes for performance

2. **Test migrations:**
   - Verify tables created
   - Test RLS policies
   - Test token generation

### Fase 2: Backend Services
1. **Token Service (`quotePublicTokens.ts`):**
   ```typescript
   - generateToken(quoteId, recipientEmail): Promise<Token>
   - validateToken(token): Promise<{ quoteId, recipientEmail, valid }>
   - getTokenByQuote(quoteId): Promise<Token[]>
   - revokeToken(tokenId): Promise<void>
   ```

2. **Tracking Service (`quoteTracking.ts`):**
   ```typescript
   - trackEvent(quoteId, tokenId, eventType, metadata): Promise<void>
   - getTrackingEvents(quoteId): Promise<TrackingEvent[]>
   - getTrackingStats(quoteId): Promise<{ views, downloads, responses }>
   ```

3. **Response Service (`quoteResponses.ts`):**
   ```typescript
   - submitResponse(quoteId, tokenId, responseType, comment): Promise<void>
   - getResponse(quoteId): Promise<QuoteResponse | null>
   ```

### Fase 3: Public Route & Page
1. **Add public route in `App.tsx`:**
   ```tsx
   <Route path="/quote/:token" element={<PublicQuoteView />} />
   ```

2. **Create `PublicQuoteView.tsx`:**
   - Validate token on mount
   - Show loading/error states
   - Track 'viewed' event
   - Render quote data (read-only)
   - Show download PDF button
   - Show accept/reject buttons (if not already responded)

3. **Create `PublicQuoteViewer.tsx` component:**
   - Display quote header (number, date, company, etc.)
   - Display line items table
   - Display totals
   - Display notes
   - Styling optimized for public view (branded)

### Fase 4: Email Integration
1. **Update `sendQuoteEmail` function:**
   - Generate token before sending
   - Create `quote_public_tokens` record
   - Generate public URL
   - Update email template to include link (remove PDF attachment)
   - Update email body text

2. **Update `SendQuoteDialog.tsx`:**
   - Remove "Attach PDF" checkbox (or make it optional for backward compatibility)
   - Show preview of public link
   - Update email body template

3. **Update Netlify function `send-quote/index.js`:**
   - Remove PDF generation and attachment
   - Include public link in email HTML
   - Update email template

### Fase 5: Accept/Reject Functionality
1. **Create `QuoteAcceptRejectForm.tsx`:**
   - Accept button (immediate action)
   - Reject button (opens dialog with comment field)
   - Show confirmation after submission
   - Disable buttons after response submitted
   - Show existing response if already responded

2. **Integrate with quote status:**
   - Update quote status on accept/reject
   - Trigger order conversion if accepted (existing logic)
   - Log activity

### Fase 6: Tracking & Analytics
1. **Implement tracking events:**
   - Track 'viewed' on page load
   - Track 'downloaded' on PDF download
   - Track 'accepted'/'rejected' on response

2. **Create tracking view for internal users:**
   - Show tracking stats in QuoteEditor
   - Display timeline of events
   - Show response if available

### Fase 7: Testing & Polish
1. **Test flows:**
   - Send quote email
   - Open public link
   - Download PDF
   - Accept quote
   - Reject quote with comment
   - View tracking in internal view

2. **Error handling:**
   - Invalid/expired token
   - Quote deleted
   - Already responded
   - Network errors

3. **UI/UX improvements:**
   - Loading states
   - Error messages
   - Success confirmations
   - Mobile responsive

---

## 🔒 Security Considerations

### Token Security
- **Token Generation:**
  - Use cryptographically secure random (crypto.randomUUID() eller crypto.getRandomValues())
  - Minimum 32 characters
  - Store hashed version? (Nej, ikke nødvendigt hvis token er lang nok)

- **Token Validation:**
  - Check token exists
  - Check not expired (if expiration enabled)
  - Check quote exists and not deleted
  - Rate limiting? (Optional: prevent brute force)

- **Token Expiration:**
  - Default: 90 days? (Konfigurerbart)
  - Optional: allow user to set expiration when sending

### RLS Policies
- **Public Access:**
  - `quote_public_tokens`: SELECT where token matches (no auth required)
  - `quote_tracking`: INSERT (no auth required for tracking)
  - `quote_responses`: INSERT (no auth required for responses)

- **Authenticated Access:**
  - Users can see tokens/tracking/responses for quotes they have access to
  - Use existing quote access logic (owner, created_by, etc.)

### Data Privacy
- **IP Address & User Agent:**
  - Optional: only store if GDPR compliant
  - Consider: make it configurable
  - Consider: anonymize IP addresses

- **Email Address:**
  - Store in `quote_public_tokens` for tracking
  - Consider: hash email? (Nej, nødvendigt for at validere recipient)

---

## 📊 Tracking Events

### Event Types
1. **`viewed`**: First time customer opens public link
   - Metadata: `{ first_view: true, timestamp }`
   - Trigger: Page load

2. **`downloaded`**: Customer downloads PDF
   - Metadata: `{ pdf_version, timestamp }`
   - Trigger: PDF download button click

3. **`accepted`**: Customer accepts quote
   - Metadata: `{ response_id, timestamp }`
   - Trigger: Accept button click

4. **`rejected`**: Customer rejects quote
   - Metadata: `{ response_id, comment, timestamp }`
   - Trigger: Reject button click

### Tracking Stats
For each quote, track:
- Total views (unique tokens accessed)
- Total downloads
- Response status (accepted/rejected/pending)
- First view timestamp
- Last access timestamp

---

## 🎨 UI/UX Design

### Public Quote View
- **Header:**
  - Company logo (if branding enabled)
  - Quote number
  - Issue date
  - Valid until date
  - Status badge

- **Content:**
  - Company info (name, address)
  - Contact info (if available)
  - Line items table (read-only)
  - Totals (subtotal, tax, total)
  - Notes

- **Actions:**
  - Download PDF button (prominent)
  - Accept button (green, prominent)
  - Reject button (red, less prominent)
  - After response: Show confirmation message

### Internal Tracking View
- **In QuoteEditor:**
  - New tab/section: "Public Access"
  - Show:
    - Public link (copy button)
    - Token expiration
    - Tracking stats (views, downloads)
    - Response status
    - Timeline of events

---

## ❓ Spørgsmål til Afklaring

### 1. Token Expiration
- **Spørgsmål:** Skal tokens have expiration? Hvis ja, hvad er standard expiration?
- **Forslag:** 30 dage standard, konfigurerbart per quote

### 2. Multiple Recipients
- **Spørgsmål:** Hvis samme quote sendes til flere modtagere, skal de have samme token eller separate tokens?
- **Forslag:** Separate tokens per recipient (bedre tracking)

### 3. PDF Download
- **Spørgsmål:** Skal PDF download være begrænset (kun én gang, eller ubegrænset)?
- **Forslag:** Ubegrænset, men track hver download

### 4. Accept/Reject Multiple Times
- **Spørgsmål:** Kan kunden ændre sin response (f.eks. reject og senere accept)?
- **Forslag:** Nej, første response er final (eller: kun hvis quote status er 'sent')

### 5. Email Template
- **Spørgsmål:** Skal email template være konfigurerbar, eller hardcoded?
- **Forslag:** Brug nuværende setup for emails

### 6. Branding
- **Spørgsmål:** Skal public quote view bruge company branding (logo, farver)?
- **Forslag:** Ja, hvis branding er konfigureret i settings

### 7. Notification on Response
- **Spørgsmål:** Skal sales team modtage email notification når kunde accepterer/afviser?
- **Forslag:** Ja, real-time notification (via existing email system)

### 8. IP Address Tracking
- **Spørgsmål:** Skal vi tracke IP addresses og user agents? (GDPR consideration)
- **Forslag:** Ja, men anonymiser IP (f.eks. fjern sidste oktet)

### 9. Backward Compatibility
- **Spørgsmål:** Skal vi beholde muligheden for at sende PDF vedhæftning som fallback?
- **Forslag:** Ja, som optional checkbox i SendQuoteDialog

### 10. Quote Status Updates
- **Spørgsmål:** Når kunde accepterer via public portal, skal det automatisk oprette order? (som nuværende flow)
- **Forslag:** Ja, samme flow som nuværende accept handling, der må gerne komme en notifikation in app, når en respons fra en kunde modtages. 

---

## 🚀 Implementation Prioritet

### Must Have (MVP)
1. ✅ Database schema (tokens, tracking, responses)
2. ✅ Token generation service
3. ✅ Public route & page
4. ✅ Email with link (no PDF)
5. ✅ Basic tracking (viewed, downloaded)
6. ✅ Accept/reject functionality

### Should Have
7. Tracking stats view (internal)
8. Email notification on response
9. Error handling & validation
10. Mobile responsive design

### Nice to Have
11. Token expiration
12. Branding on public view
13. Multiple token support (resend to same recipient)
14. Advanced analytics dashboard
15. Email template customization

---

## 📝 Notes

### Technical Decisions
- **Token Format:** UUID v4 (32 chars) + optional prefix for readability
- **Public URL Format:** `/quote/{token}` (simple, clean)
- **Tracking:** Asynchronous, non-blocking (fire-and-forget)
- **Response Storage:** Separate table for better historik

### Future Enhancements
- Email reminders (if quote not viewed after X days)
- Quote versioning (track changes)
- Signature capture for acceptance
- Multi-language support for public view
- Social sharing (optional)

---

## ✅ Acceptance Criteria

### Email Sending
- [ ] Email contains public link (not PDF attachment)
- [ ] Link is unique per quote + recipient
- [ ] Link is secure (cannot be guessed)

### Public View
- [ ] Customer can view quote without login
- [ ] Quote displays correctly (all data visible)
- [ ] Customer can download PDF
- [ ] Customer can accept quote
- [ ] Customer can reject quote with comment

### Tracking
- [ ] 'viewed' event tracked on first access
- [ ] 'downloaded' event tracked on PDF download
- [ ] 'accepted'/'rejected' events tracked
- [ ] Tracking visible to internal users

### Status Updates
- [ ] Quote status updates to 'accepted' when customer accepts
- [ ] Quote status updates to 'declined' when customer rejects
- [ ] Order created automatically when accepted (existing flow)

---

**Status:** ✅ **IMPLEMENTERET** - Alle migrations anvendt, kode klar

**Implementerings Status:**
- ✅ Fase 1: Database Setup - FÆRDIG (migrations anvendt)
- ✅ Fase 2: Backend Services - FÆRDIG
- ✅ Fase 3: Public Route & Page - FÆRDIG
- ✅ Fase 4: Email Integration - FÆRDIG
- ✅ Fase 5: Accept/Reject Functionality - FÆRDIG
- ⏳ Fase 6: Tracking & Analytics - PENDING
- ⏳ Fase 7: Testing & Polish - PENDING

**Næste Skridt:** 
1. ✅ Migrations anvendt - tabeller oprettet
2. ⚠️ **VIGTIGT:** Sæt `VITE_APP_URL` environment variable til production URL (f.eks. `https://crmflow-app.netlify.app`) i `.env` filen
3. Test email sending (kræver valid Gmail token)
4. Test public quote view
5. Test accept/reject flow
6. Implementer Fase 6 (Tracking view for internal users)
