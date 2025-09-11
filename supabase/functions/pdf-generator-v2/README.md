# PDF Generator v2 - Professional Invoice Generator

This Deno edge function generates professional PDF invoices using pdf-lib with a modern, branded layout.

## Features

- **Professional Layout**: Branded header, two-column addresses, zebra-striped table, totals box
- **Danish Character Support**: Uses Inter font with fallback to Helvetica
- **Color Palette**: Implements your brand colors (#698BB5 primary, etc.)
- **Image Support**: Logo embedding in header, QR codes in payment section
- **Responsive Design**: Text wrapping, proper spacing, A4 format
- **Error Handling**: Graceful fallbacks for missing resources

## Usage

```typescript
// POST request to the function
const response = await fetch('/functions/v1/pdf-generator-v2', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    type: 'invoice',
    data: {
      id: 'invoice-uuid-here'
    }
  })
})

const pdfBlob = await response.blob()
```

## Configuration Files

- `deno.json`: Deno configuration with proper lib settings
- `types.d.ts`: TypeScript declarations for Deno globals
- `index.ts`: Main function implementation

## Layout Structure

1. **Header Bar**: Primary color background with logo/company name and "FAKTURA" text
2. **Meta Box**: Invoice details (number, date, due date) in top-right
3. **Addresses**: Two-column layout (From/To)
4. **Line Items Table**: Zebra-striped with proper column alignment
5. **Totals Box**: Right-aligned with subtotal, tax, and total
6. **Payment Section**: Terms, notes, and optional QR code
7. **Footer**: Page numbering

## Color Palette

- Primary: #698BB5 (header bar)
- Light Green: #C5CB9D (table headers)
- Cream: #ECE0CA (zebra striping)
- Green: #98A095 (borders)
- Tan: #CDBA9A (lines)

## Font Support

- Attempts to load Inter font from Google Fonts
- Falls back to Helvetica if Inter fails
- Supports Danish characters (æ, ø, å) without escaping

## Image Support

- Company logos: `invoice.company.logo_url` (max 120x40 pt)
- QR codes: `invoice.payment_qr_url` (120x120 pt)
- Graceful fallback if images fail to load
