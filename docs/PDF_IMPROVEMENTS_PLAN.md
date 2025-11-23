# PDF Generering - Forbedringsplan

## 📊 Status Oversigt

**Fase 1 (Kritiske Fixes):** ✅ **COMPLETED** (3/3)
- ✅ Fjern unødvendige overskrifter
- ✅ Kombiner kundens firma og kontaktperson data
- ✅ Én boks med kundedata (ingen overskrift)

**Fase 2 (Vigtige Forbedringer):** ✅ **COMPLETED** (4/4)
- ✅ Dynamisk moms rate
- ✅ Notes/bemærkninger
- ✅ CVR/VAT nummer
- ✅ Discount/rabat håndtering

**Fase 3 (Design Forbedringer):** 🟡 **IN PROGRESS** (1/5)
- ✅ Betalingsbetingelser
- ⏳ Logo support
- ⏳ Bedre layout og spacing
- ⏳ Valuta symbol i tabeller
- ⏳ Tom linje items håndtering

---

## 🔴 Kritiske Problemer (Hurtige Fixes)

### 1. Fjern Unødvendige Overskrifter ✅ COMPLETED
**Problem:** 
- "SOLGT AF" / "TILBUD TIL" / "KUNDE" / "FAKTURERET TIL" overskrifter er unødvendige
- Dokumenttypen er allerede tydelig i header ("TILBUD", "ORDRE", "FAKTURA")
- "SOLGT AF" er også forkert - det er kundens data der står under, ikke sælgerens
- Sælgerens info (firmanavn) står allerede i header

**Løsning:**
- ✅ Fjern alle overskrifter fra adressebokse ("SOLGT AF", "TILBUD TIL", "KUNDE", "FAKTURERET TIL")
- ✅ Fjern "Solgt af" boks helt (firmanavn står allerede i header)
- ✅ Vis kun én boks med kundedata (ingen overskrift)

**Status:** Implementeret - Alle overskrifter fjernet fra Quote, Order og Invoice

**Fil:** `netlify/functions/pdf-react/index.mjs` linje 339-348 (Quote), ~500 (Order), ~650 (Invoice)

---

### 2. Manglende Kundens Firma Information ✅ COMPLETED
**Problem:** Viser kun kontaktperson, ikke kundens firma (hvis kontaktperson har company_id).

**Løsning:**
- ✅ Opdateret query til at hente kontaktpersonens firma: `contact:people(*, company:companies(*))`
- ✅ Kombineret firma og kontaktperson data i én boks
- ✅ Format implementeret: 
  ```
  [Firmanavn] (hvis kontaktperson har firma)
  [Kontaktperson navn]
  [Adresse] (fra firma)
  [Postnummer By] (fra firma)
  [Email] (prioriterer kontaktperson, ellers firma)
  [Telefon] (prioriterer kontaktperson, ellers firma)
  ```

**Status:** Implementeret - Kundens firma og kontaktperson kombineret i én boks for alle tre dokumenttyper

**Fil:** `netlify/functions/pdf-react/index.mjs` linje ~790 (query), ~281-305 (Quote), ~450-475 (Order), ~600-625 (Invoice)

---

## 🟡 Vigtige Forbedringer (Mellem Prioritet)

### 4. Hardcoded Moms Rate ✅ COMPLETED
**Problem:** Moms er hardcoded til 25% i alle PDF'er.

**Løsning:**
- ✅ Oprettet `calculateTaxRates()` funktion der beregner moms rates fra line items
- ✅ Henter `tax_rate_pct` fra hver line item
- ✅ Grupperer line items efter moms rate
- ✅ Viser dynamisk moms rate: "Moms (25%)" eller "Moms (20%)"
- ✅ Hvis forskellige rates, viser hver rate separat
- ✅ Fallback til at beregne fra totals hvis line items mangler data

**Status:** Implementeret - Alle tre dokumenttyper (Quote, Order, Invoice) viser nu dynamisk moms rate

**Fil:** `netlify/functions/pdf-react/index.mjs` linje ~55-95 (calculateTaxRates), ~388-420 (Quote), ~603-635 (Order), ~760-792 (Invoice)

---

### 5. Manglende Notes/Bemærkninger ✅ COMPLETED
**Problem:** `notes` felt fra quote/order/invoice vises ikke i PDF.

**Løsning:**
- ✅ Tilføjet notes sektion efter totals, før footer
- ✅ Vis kun hvis notes eksisterer (conditional rendering)
- ✅ Format: "Bemærkninger:" + notes tekst
- ✅ Styling: Grå boks med border, læsbar tekst

**Status:** Implementeret - Alle tre dokumenttyper (Quote, Order, Invoice) viser nu notes hvis de eksisterer

**Fil:** `netlify/functions/pdf-react/index.mjs` linje ~290-295 (styles), ~450-455 (Quote), ~650-655 (Order), ~820-825 (Invoice)

---

### 6. Manglende CVR/VAT Nummer ✅ COMPLETED
**Problem:** CVR/VAT nummer vises ikke (vigtigt for fakturaer).

**Løsning:**
- ✅ Henter CVR/VAT fra `company.vat` felt
- ✅ Viser i header boks sammen med firmanavn (hvor virksomhedsdata allerede er)
- ✅ Format: "CVR: 12345678" (vises under firmanavn)
- ✅ Viser kun hvis CVR/VAT eksisterer

**Status:** Implementeret - CVR/VAT vises nu i header for alle tre dokumenttyper (Quote, Order, Invoice)

**Fil:** `netlify/functions/pdf-react/index.mjs` linje ~80-85 (styles), ~390-395 (Quote), ~555-560 (Order), ~730-735 (Invoice)

---

### 7. Ingen Discount/Rabat Håndtering ✅ COMPLETED
**Problem:** Line items kan have discount, men det vises ikke i PDF.

**Løsning:**
- ✅ Henter `discount_pct` fra line items
- ✅ Beregner korrekt total med rabat: `lineTotal - (lineTotal * discountPct / 100)`
- ✅ Viser rabat i produktbeskrivelsen: "Produktnavn (10% rabat)" hvis discount > 0
- ✅ Total kolonne viser nu korrekt pris efter rabat

**Status:** Implementeret - Alle tre dokumenttyper (Quote, Order, Invoice) viser nu discount og beregner korrekt total

**Fil:** `netlify/functions/pdf-react/index.mjs` linje ~459-471 (Quote), ~636-648 (Order), ~812-824 (Invoice)

---

### 8. Manglende Betalingsbetingelser ✅ COMPLETED
**Problem:** Ingen betalingsbetingelser på fakturaer.

**Løsning:**
- ✅ Tilføjet "Betalingsbetingelser" sektion
- ✅ Viser "Betalingsfrist: [due_date]" hvis due_date eksisterer
- ✅ Standard tekst: "Betalingsfrist: 30 dage" hvis due_date mangler
- ✅ Placeret efter totals og før notes sektion

**Status:** Implementeret - Betalingsbetingelser vises nu på alle fakturaer

**Fil:** `netlify/functions/pdf-react/index.mjs` linje ~886-893 (Invoice sektion)

---

## 🟢 Design Forbedringer (Lav Prioritet)

### 9. Forbedret Layout og Spacing
**Problem:** Nogle sektioner kan være bedre organiseret.

**Løsning:**
- Bedre spacing mellem sektioner
- Mere luft i bokse
- Bedre alignment

**Fil:** `netlify/functions/pdf-react/index.mjs` linje 57-274 (styles)

---

### 10. Manglende Logo Support
**Problem:** Ingen mulighed for at vise logo.

**Løsning:**
- Hent logo URL fra company.logo_url
- Vis logo i header hvis tilgængelig
- Fallback til tekst hvis ingen logo

**Fil:** `netlify/functions/pdf-react/index.mjs` - Header sektion

---

### 11. Valuta Symbol i Tabeller
**Problem:** Valuta vises kun i totals, ikke i enhedspris kolonne.

**Løsning:**
- Vis valuta symbol i alle priser
- Eller vis valuta i tabel header: "ENHEDSPRIS (DKK)"

**Fil:** `netlify/functions/pdf-react/index.mjs` linje 371-374

---

### 12. Tom Linje Items Håndtering
**Problem:** Hvis ingen line items, vises tom tabel.

**Løsning:**
- Vis besked: "Ingen linjer tilføjet endnu"
- Eller skjul tabel hvis tom

**Fil:** `netlify/functions/pdf-react/index.mjs` linje 365-389

---

### 13. Bedre Footer Information ✅ COMPLETED
**Problem:** Footer viser kun website, email, telefon.

**Løsning:**
- ✅ Tilføjet "www." foran website (www.flownordics.com)
- ✅ Tilføjet "+45" foran telefonnummer (+45 31 74 39 01)
- ✅ Tilføjet CVR/VAT nummer hvis tilgængelig fra company objekt
- ✅ Bedre formatering med separatorer (•)

**Status:** Implementeret - Footer viser nu komplet kontaktinformation med korrekt formatering

**Fil:** `netlify/functions/pdf-react/index.mjs` linje ~409-413 (Quote), ~603-607 (Order), ~792-796 (Invoice)

---

### 14. Issue Date vs Created Date ✅ COMPLETED
**Problem:** Bruger `created_at` i stedet for `issue_date` på quotes.

**Løsning:**
- ✅ Bruger nu `issue_date` hvis tilgængelig
- ✅ Fallback til `created_at` hvis `issue_date` er null
- ✅ Konsistent med orders (`order_date`) og invoices (`invoice_date`)

**Status:** Implementeret - Quotes viser nu korrekt issue_date

**Fil:** `netlify/functions/pdf-react/index.mjs` linje ~452 (Quote sektion)

---

### 15. Bedre Metadata Visning ✅ COMPLETED
**Problem:** Metadata bokse kan være mere informative.

**Løsning:**
- ✅ Tilføjet STATUS på alle dokumenttyper (quotes, orders, invoices)
- ✅ Tilføjet VALUTA på alle dokumenttyper
- ✅ Bedre gruppering - alle relevante felter samlet i én boks
- ✅ Konsistent struktur på tværs af dokumenttyper

**Status:** Implementeret - Metadata visning er nu mere informativ

**Fil:** `netlify/functions/pdf-react/index.mjs` linje ~448-462 (Quote), ~630-644 (Order), ~814-828 (Invoice)

---

## 📋 Implementerings Prioritet

### Fase 1: Kritiske Fixes (1-2 timer)
1. ✅ **COMPLETED** - Fjern unødvendige overskrifter (alle overskrifter fjernet)
2. ✅ **COMPLETED** - Fjern unødvendig boks (kun én boks med kundedata)
3. ✅ **COMPLETED** - Tilføj kundens firma information (kombineret med kontaktperson)

### Fase 2: Vigtige Forbedringer (2-3 timer)
4. ✅ **COMPLETED** - Dynamisk moms rate (beregnes fra line items, viser alle rates hvis forskellige)
5. ✅ **COMPLETED** - Notes/bemærkninger (viser notes hvis de eksisterer, efter totals)
6. ✅ **COMPLETED** - CVR/VAT nummer (vises i header boks sammen med firmanavn)
7. ✅ **COMPLETED** - Discount/rabat håndtering (vises i produktbeskrivelse, total beregnes korrekt)

### Fase 3: Design Forbedringer (3-4 timer)
8. ✅ Betalingsbetingelser
9. ✅ Logo support
10. ✅ Bedre layout og spacing
11. ✅ Valuta symbol i tabeller
12. ✅ Tom linje items håndtering

---

## 🎯 Anbefalet Implementerings Rækkefølge

1. ✅ **Fase 1 COMPLETED** - Kritiske fixes er implementeret
2. **Næste: Fase 2** - Vigtige funktioner der mangler
3. **Til sidst: Fase 3** - Polering og design forbedringer

---

## 📝 Noter

- Alle ændringer skal testes på Quote, Order og Invoice
- Husk at tjekke at alle felter eksisterer i databasen før brug
- Brug optional chaining (`?.`) for at undgå fejl
- Test med tomme/null værdier

