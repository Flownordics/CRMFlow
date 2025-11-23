// Netlify Function - React PDF Generator (ES Module)
import { createClient } from '@supabase/supabase-js';
import { renderToStream, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Brand Colors - FlowNordics
const COLORS = {
  brand: {
    purple: '#330065',        // Primary brand purple
    purpleDark: '#220044',    // Darker shade for depth
    purpleLight: '#4d0099',   // Lighter shade
    green: '#7ef791',         // Accent green
    greenLight: '#b3fac1',    // Light green for backgrounds
    greenDark: '#5ed975',     // Darker green for emphasis
  },
  neutral: {
    white: '#ffffff',
    gray50: '#fafafa',
    gray100: '#f5f5f5',
    gray200: '#efefef',
    gray300: '#dcdcdc',
    gray400: '#bdbdbd',
    gray500: '#989898',
    gray600: '#7c7c7c',
    gray700: '#656565',
    gray800: '#464646',
    gray900: '#3d3d3d',
    black: '#292929',
  },
  semantic: {
    success: '#7ef791',
    info: '#4d0099',
  }
};

// Helper functions
const formatCurrency = (value, currency = 'DKK') => {
  const amount = value / 100;
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('da-DK');
};

// Calculate tax rates from line items
const calculateTaxRates = (items, subtotalMinor, taxMinor) => {
  if (!items || items.length === 0) {
    // If no items, calculate rate from totals
    if (subtotalMinor > 0 && taxMinor > 0) {
      const rate = Math.round((taxMinor / subtotalMinor) * 100);
      return [{ rate, amount: taxMinor }];
    }
    // Default to 25% if no data
    return [{ rate: 25, amount: taxMinor || 0 }];
  }

  // Group line items by tax rate
  const taxGroups = new Map();
  
  items.forEach(item => {
    const taxRate = item.tax_rate_pct || 25; // Default to 25% if not specified
    const qty = item.qty || 1;
    const unitPrice = item.unit_minor || 0;
    const discountPct = item.discount_pct || 0;
    
    // Calculate line total with discount
    const lineTotal = qty * unitPrice;
    const discountAmount = (lineTotal * discountPct) / 100;
    const lineSubtotal = lineTotal - discountAmount;
    
    // Calculate tax for this line
    const lineTax = (lineSubtotal * taxRate) / 100;
    
    if (taxGroups.has(taxRate)) {
      taxGroups.set(taxRate, taxGroups.get(taxRate) + lineTax);
    } else {
      taxGroups.set(taxRate, lineTax);
    }
  });

  // Convert to array and sort by rate
  const taxRates = Array.from(taxGroups.entries())
    .map(([rate, amount]) => ({ rate: Math.round(rate), amount: Math.round(amount) }))
    .sort((a, b) => a.rate - b.rate);

  // If we have calculated tax but it doesn't match document tax_minor, use document value
  const calculatedTotal = taxRates.reduce((sum, t) => sum + t.amount, 0);
  if (taxRates.length === 1 && Math.abs(calculatedTotal - taxMinor) > 1) {
    // Use document tax_minor if it's different (might be rounded differently)
    taxRates[0].amount = taxMinor;
  }

  return taxRates.length > 0 ? taxRates : [{ rate: 25, amount: taxMinor || 0 }];
};

// Modern shared styles for all document types
const createSharedStyles = () => StyleSheet.create({
  // Page structure
  page: { 
    padding: 45, 
    fontSize: 10, 
    fontFamily: 'Helvetica', 
    backgroundColor: COLORS.neutral.white,
    color: COLORS.neutral.gray900,
  },
  
  // Header section with modern design
  header: { 
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.brand.purple,
    borderBottomStyle: 'solid',
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  companyName: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: COLORS.brand.purple,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  companyVat: {
    fontSize: 9,
    color: COLORS.neutral.gray600,
    letterSpacing: 0.3,
  },
  documentTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: COLORS.brand.purple,
    textAlign: 'right',
    letterSpacing: 1.5,
  },
  
  // Metadata section with clean grid
  metadata: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metaColumn: { 
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: COLORS.neutral.gray50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
    borderStyle: 'solid',
  },
  metaItem: { 
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: { 
    fontSize: 8, 
    color: COLORS.neutral.gray600,
    letterSpacing: 0.8,
    fontWeight: 600,
    marginRight: 10,
  },
  metaValue: { 
    fontSize: 9, 
    fontWeight: 'bold', 
    color: COLORS.neutral.gray900,
  },
  
  // Two-column section for addresses
  twoColumns: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
  },
  column: { 
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: COLORS.neutral.gray50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
    borderStyle: 'solid',
  },
  columnTitle: { 
    fontSize: 10, 
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.brand.purple,
    letterSpacing: 0.8,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.brand.green,
    borderBottomStyle: 'solid',
  },
  columnText: { 
    fontSize: 9.5, 
    marginBottom: 4,
    color: COLORS.neutral.gray800,
    lineHeight: 1.4,
  },
  
  // Modern table design
  table: { 
    marginTop: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
    borderStyle: 'solid',
    borderRadius: 4,
  },
  tableHeader: { 
    flexDirection: 'row',
    backgroundColor: COLORS.brand.purple,
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
    color: COLORS.neutral.white,
    letterSpacing: 0.5,
  },
  tableRow: { 
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.gray200,
    borderBottomStyle: 'solid',
    padding: 8,
    fontSize: 9,
  },
  tableRowEven: { 
    backgroundColor: COLORS.neutral.gray50,
  },
  tableCol1: { 
    flex: 3,
    paddingRight: 8,
  },
  tableCol2: { 
    flex: 1,
    textAlign: 'right',
    paddingRight: 8,
  },
  tableCol3: { 
    flex: 1.2,
    textAlign: 'right',
    paddingRight: 8,
  },
  tableCol4: { 
    flex: 1.2,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  
  // Modern totals section with accent color
  totals: { 
    marginTop: 15,
    marginLeft: 'auto',
    width: 240,
    backgroundColor: COLORS.neutral.gray50,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
    borderStyle: 'solid',
    borderRadius: 4,
  },
  totalsHeader: {
    backgroundColor: COLORS.brand.purple,
    padding: 8,
  },
  totalsHeaderText: {
    color: COLORS.neutral.white,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  totalsBody: {
    padding: 10,
  },
  totalRow: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    fontSize: 9.5,
    color: COLORS.neutral.gray800,
  },
  totalsDivider: { 
    borderTopWidth: 2,
    borderTopColor: COLORS.brand.green,
    borderTopStyle: 'solid',
    marginVertical: 8,
  },
  totalFinal: { 
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.brand.purple,
    paddingTop: 5,
  },
  totalFinalAmount: {
    color: COLORS.neutral.gray900,
    fontSize: 14,
  },
  
  // Professional footer
  footer: { 
    position: 'absolute',
    bottom: 30,
    left: 45,
    right: 45,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: COLORS.brand.purple,
    borderTopStyle: 'solid',
    fontSize: 7.5,
    color: COLORS.neutral.gray600,
  },
  footerText: {
    color: COLORS.neutral.gray600,
  },
  
  // Notes section
  notesSection: {
    marginTop: 15,
    marginBottom: 12,
    padding: 10,
    backgroundColor: COLORS.neutral.gray50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
    borderStyle: 'solid',
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.brand.purple,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 9,
    color: COLORS.neutral.gray800,
    lineHeight: 1.5,
  },
  paymentTermsSection: {
    marginTop: 15,
    marginBottom: 12,
    padding: 10,
    backgroundColor: COLORS.neutral.gray50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
    borderStyle: 'solid',
  },
  paymentTermsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.brand.purple,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  paymentTermsText: {
    fontSize: 9,
    color: COLORS.neutral.gray800,
    lineHeight: 1.5,
  },
});

// Create Quote PDF Document
const createQuotePDF = (quote, items) => {
  const currency = quote.currency || 'DKK';
  const styles = createSharedStyles();

  // Combine customer company and contact person data
  const customerCompany = quote.contact?.company;
  const contactName = quote.contact?.name || 
    (quote.contact?.first_name && quote.contact?.last_name 
      ? `${quote.contact.first_name} ${quote.contact.last_name}`.trim() 
      : quote.contact?.first_name || quote.contact?.last_name || null);
  
  const billToLines = [
    // Company name (if contact has a company)
    customerCompany?.name,
    // Contact person name
    contactName,
    // Address (from company if available)
    customerCompany?.address,
    customerCompany?.postal_code && customerCompany?.city 
      ? `${customerCompany.postal_code} ${customerCompany.city}`.trim()
      : customerCompany?.city || customerCompany?.postal_code,
    // Email (prefer contact email, fallback to company email)
    quote.contact?.email || customerCompany?.email,
    // Phone (prefer contact phone, fallback to company phone)
    quote.contact?.phone || customerCompany?.phone,
  ].filter(Boolean);

  // Footer should show seller's (our) company data, not customer's
  // Format: www.website • +45 phone • CVR: vat_number
  const sellerFooter = [
    'www.flownordics.com',
    '+45 31 74 39 01',
    quote.company?.vat ? `CVR: ${quote.company.vat}` : null,
  ].filter(Boolean).join('  •  ');

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          { style: styles.headerTop },
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.companyName }, quote.company?.name || 'VIRKSOMHED'),
            quote.company?.vat ? React.createElement(Text, { style: styles.companyVat }, `CVR: ${quote.company.vat}`) : null
          ),
          React.createElement(Text, { style: styles.documentTitle }, 'TILBUD')
        ),
        // Empty - metadata moved below
      ),
      // Customer Information and Metadata side-by-side
      React.createElement(
        View,
        { style: styles.twoColumns },
        // Left: Customer Information
        React.createElement(
          View,
          { style: styles.column },
          ...billToLines.map((line, i) => React.createElement(Text, { key: i, style: styles.columnText }, line))
        ),
        // Right: Combined Metadata
        React.createElement(
          View,
          { style: styles.metaColumn },
          React.createElement(View, { style: styles.metaItem }, 
            React.createElement(Text, { style: styles.metaLabel }, 'DATO'),
            React.createElement(Text, { style: styles.metaValue }, formatDate(quote.issue_date || quote.created_at))
          ),
          React.createElement(View, { style: styles.metaItem },
            React.createElement(Text, { style: styles.metaLabel }, 'TILBUD NR.'),
            React.createElement(Text, { style: styles.metaValue }, quote.number || '-')
          ),
          React.createElement(View, { style: styles.metaItem },
            React.createElement(Text, { style: styles.metaLabel }, 'VALUTA'),
            React.createElement(Text, { style: styles.metaValue }, quote.currency || 'DKK')
          ),
          React.createElement(View, { style: styles.metaItem },
            React.createElement(Text, { style: styles.metaLabel }, 'GYLDIG TIL'),
            React.createElement(Text, { style: styles.metaValue }, formatDate(quote.valid_until))
          )
        )
      ),
      // Table
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: styles.tableCol1 }, 'PRODUKT'),
          React.createElement(Text, { style: styles.tableCol2 }, 'ENHEDER'),
          React.createElement(Text, { style: styles.tableCol3 }, 'ENHEDSPRIS'),
          React.createElement(Text, { style: styles.tableCol4 }, 'TOTAL')
        ),
        ...items.map((item, i) => {
          const qty = item.qty || 1;
          const unitPrice = item.unit_minor || 0;
          const discountPct = item.discount_pct || 0;
          
          // Calculate line total with discount
          const lineTotal = qty * unitPrice;
          const discountAmount = (lineTotal * discountPct) / 100;
          const totalAfterDiscount = lineTotal - discountAmount;
          
          // Build description with discount info if applicable
          let description = item.description || '—';
          if (discountPct > 0) {
            description += ` (${discountPct}% rabat)`;
          }
          
          return React.createElement(
            View,
            { key: i, style: [styles.tableRow, i % 2 === 0 && styles.tableRowEven] },
            React.createElement(Text, { style: styles.tableCol1 }, description),
            React.createElement(Text, { style: styles.tableCol2 }, String(qty)),
            React.createElement(Text, { style: styles.tableCol3 }, formatCurrency(unitPrice, currency)),
            React.createElement(Text, { style: styles.tableCol4 }, formatCurrency(totalAfterDiscount, currency))
          );
        })
      ),
      // Totals
      (() => {
        const taxRates = calculateTaxRates(items, quote.subtotal_minor || 0, quote.tax_minor || 0);
        
        return         React.createElement(
          View,
          { style: styles.totals },
          React.createElement(
            View,
            { style: styles.totalsBody },
            React.createElement(
              View,
              { style: styles.totalRow },
              React.createElement(Text, null, 'Subtotal'),
              React.createElement(Text, null, formatCurrency(quote.subtotal_minor || 0, currency))
            ),
            // Dynamic tax rates - show each rate separately if different
            ...taxRates.map((tax, idx) => 
              React.createElement(
                View,
                { key: idx, style: styles.totalRow },
                React.createElement(Text, null, `Moms (${tax.rate}%)`),
                React.createElement(Text, null, formatCurrency(tax.amount, currency))
              )
            ),
            React.createElement(View, { style: styles.totalsDivider }),
            React.createElement(
              View,
              { style: [styles.totalRow, styles.totalFinal] },
              React.createElement(Text, null, 'Total'),
              React.createElement(Text, { style: styles.totalFinalAmount }, formatCurrency(quote.total_minor || 0, currency))
            )
          )
        );
      })(),
      // Notes (if present)
      quote.notes ? React.createElement(
        View,
        { style: styles.notesSection },
        React.createElement(Text, { style: styles.notesTitle }, 'Bemærkninger'),
        React.createElement(Text, { style: styles.notesText }, quote.notes)
      ) : null,
      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, sellerFooter),
        React.createElement(Text, { 
          style: styles.footerText,
          render: ({ pageNumber, totalPages }) => `Side ${pageNumber} af ${totalPages}` 
        })
      )
    )
  );
};

// Create Order PDF Document
const createOrderPDF = (order, items) => {
  const currency = order.currency || 'DKK';
  const styles = createSharedStyles();

  // Combine customer company and contact person data
  const customerCompany = order.contact?.company;
  const contactName = order.contact?.name || 
    (order.contact?.first_name && order.contact?.last_name 
      ? `${order.contact.first_name} ${order.contact.last_name}`.trim() 
      : order.contact?.first_name || order.contact?.last_name || null);
  
  const billToLines = [
    // Company name (if contact has a company)
    customerCompany?.name,
    // Contact person name
    contactName,
    // Address (from company if available)
    customerCompany?.address,
    customerCompany?.postal_code && customerCompany?.city 
      ? `${customerCompany.postal_code} ${customerCompany.city}`.trim()
      : customerCompany?.city || customerCompany?.postal_code,
    // Email (prefer contact email, fallback to company email)
    order.contact?.email || customerCompany?.email,
    // Phone (prefer contact phone, fallback to company phone)
    order.contact?.phone || customerCompany?.phone,
  ].filter(Boolean);

  // Footer should show seller's (our) company data, not customer's
  // Format: www.website • +45 phone • CVR: vat_number
  const sellerFooter = [
    'www.flownordics.com',
    '+45 31 74 39 01',
    order.company?.vat ? `CVR: ${order.company.vat}` : null,
  ].filter(Boolean).join('  •  ');

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          { style: styles.headerTop },
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.companyName }, order.company?.name || 'VIRKSOMHED'),
            order.company?.vat ? React.createElement(Text, { style: styles.companyVat }, `CVR: ${order.company.vat}`) : null
          ),
          React.createElement(Text, { style: styles.documentTitle }, 'ORDRE')
        ),
        // Empty - metadata moved below
      ),
      // Customer Information and Metadata side-by-side
      React.createElement(
        View,
        { style: styles.twoColumns },
        // Left: Customer Information
        React.createElement(
          View,
          { style: styles.column },
          ...billToLines.map((line, i) => React.createElement(Text, { key: i, style: styles.columnText }, line))
        ),
        // Right: Combined Metadata
        React.createElement(
          View,
          { style: styles.metaColumn },
          React.createElement(View, { style: styles.metaItem }, 
            React.createElement(Text, { style: styles.metaLabel }, 'ORDRE DATO'),
            React.createElement(Text, { style: styles.metaValue }, formatDate(order.order_date || order.created_at))
          ),
          React.createElement(View, { style: styles.metaItem },
            React.createElement(Text, { style: styles.metaLabel }, 'ORDRE NR.'),
            React.createElement(Text, { style: styles.metaValue }, order.number || '-')
          ),
          React.createElement(View, { style: styles.metaItem },
            React.createElement(Text, { style: styles.metaLabel }, 'VALUTA'),
            React.createElement(Text, { style: styles.metaValue }, order.currency || 'DKK')
          )
        )
      ),
      // Table
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: styles.tableCol1 }, 'PRODUKT'),
          React.createElement(Text, { style: styles.tableCol2 }, 'ENHEDER'),
          React.createElement(Text, { style: styles.tableCol3 }, 'ENHEDSPRIS'),
          React.createElement(Text, { style: styles.tableCol4 }, 'TOTAL')
        ),
        ...items.map((item, i) => {
          const qty = item.qty || 1;
          const unitPrice = item.unit_minor || 0;
          const discountPct = item.discount_pct || 0;
          
          // Calculate line total with discount
          const lineTotal = qty * unitPrice;
          const discountAmount = (lineTotal * discountPct) / 100;
          const totalAfterDiscount = lineTotal - discountAmount;
          
          // Build description with discount info if applicable
          let description = item.description || '—';
          if (discountPct > 0) {
            description += ` (${discountPct}% rabat)`;
          }
          
          return React.createElement(
            View,
            { key: i, style: [styles.tableRow, i % 2 === 0 && styles.tableRowEven] },
            React.createElement(Text, { style: styles.tableCol1 }, description),
            React.createElement(Text, { style: styles.tableCol2 }, String(qty)),
            React.createElement(Text, { style: styles.tableCol3 }, formatCurrency(unitPrice, currency)),
            React.createElement(Text, { style: styles.tableCol4 }, formatCurrency(totalAfterDiscount, currency))
          );
        })
      ),
      // Totals
        React.createElement(
          View,
          { style: styles.totals },
          React.createElement(
            View,
            { style: styles.totalsBody },
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(Text, null, 'Subtotal'),
            React.createElement(Text, null, formatCurrency(order.subtotal_minor || 0, currency))
          ),
          // Dynamic tax rates
          ...(() => {
            const taxRates = calculateTaxRates(items, order.subtotal_minor || 0, order.tax_minor || 0);
            return taxRates.map((tax, idx) => 
              React.createElement(
                View,
                { key: idx, style: styles.totalRow },
                React.createElement(Text, null, `Moms (${tax.rate}%)`),
                React.createElement(Text, null, formatCurrency(tax.amount, currency))
              )
            );
          })(),
          React.createElement(View, { style: styles.totalsDivider }),
          React.createElement(
            View,
            { style: [styles.totalRow, styles.totalFinal] },
            React.createElement(Text, null, 'Total'),
            React.createElement(Text, { style: styles.totalFinalAmount }, formatCurrency(order.total_minor || 0, currency))
          )
        )
      ),
      // Notes (if present)
      order.notes ? React.createElement(
        View,
        { style: styles.notesSection },
        React.createElement(Text, { style: styles.notesTitle }, 'Bemærkninger'),
        React.createElement(Text, { style: styles.notesText }, order.notes)
      ) : null,
      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, sellerFooter),
        React.createElement(Text, { 
          style: styles.footerText,
          render: ({ pageNumber, totalPages }) => `Side ${pageNumber} af ${totalPages}` 
        })
      )
    )
  );
};

// Create Invoice PDF Document
const createInvoicePDF = (invoice, items) => {
  const currency = invoice.currency || 'DKK';
  const styles = createSharedStyles();

  // Combine customer company and contact person data
  const customerCompany = invoice.contact?.company;
  const contactName = invoice.contact?.name || 
    (invoice.contact?.first_name && invoice.contact?.last_name 
      ? `${invoice.contact.first_name} ${invoice.contact.last_name}`.trim() 
      : invoice.contact?.first_name || invoice.contact?.last_name || null);
  
  const billToLines = [
    // Company name (if contact has a company)
    customerCompany?.name,
    // Contact person name
    contactName,
    // Address (from company if available)
    customerCompany?.address,
    customerCompany?.postal_code && customerCompany?.city 
      ? `${customerCompany.postal_code} ${customerCompany.city}`.trim()
      : customerCompany?.city || customerCompany?.postal_code,
    // Email (prefer contact email, fallback to company email)
    invoice.contact?.email || customerCompany?.email,
    // Phone (prefer contact phone, fallback to company phone)
    invoice.contact?.phone || customerCompany?.phone,
  ].filter(Boolean);

  // Footer should show seller's (our) company data, not customer's
  // Format: www.website • +45 phone • CVR: vat_number
  const sellerFooter = [
    'www.flownordics.com',
    '+45 31 74 39 01',
    invoice.company?.vat ? `CVR: ${invoice.company.vat}` : null,
  ].filter(Boolean).join('  •  ');

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          { style: styles.headerTop },
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.companyName }, invoice.company?.name || 'VIRKSOMHED'),
            invoice.company?.vat ? React.createElement(Text, { style: styles.companyVat }, `CVR: ${invoice.company.vat}`) : null
          ),
          React.createElement(Text, { style: styles.documentTitle }, 'FAKTURA')
        ),
        // Empty - metadata moved below
      ),
      // Customer Information and Metadata side-by-side
      React.createElement(
        View,
        { style: styles.twoColumns },
        // Left: Customer Information
        React.createElement(
          View,
          { style: styles.column },
          ...billToLines.map((line, i) => React.createElement(Text, { key: i, style: styles.columnText }, line))
        ),
        // Right: Combined Metadata
        React.createElement(
          View,
          { style: styles.metaColumn },
          React.createElement(View, { style: styles.metaItem }, 
            React.createElement(Text, { style: styles.metaLabel }, 'FAKTURA DATO'),
            React.createElement(Text, { style: styles.metaValue }, formatDate(invoice.invoice_date || invoice.created_at))
          ),
          React.createElement(View, { style: styles.metaItem },
            React.createElement(Text, { style: styles.metaLabel }, 'FAKTURA NR.'),
            React.createElement(Text, { style: styles.metaValue }, invoice.invoice_number || '-')
          ),
          React.createElement(View, { style: styles.metaItem },
            React.createElement(Text, { style: styles.metaLabel }, 'VALUTA'),
            React.createElement(Text, { style: styles.metaValue }, invoice.currency || 'DKK')
          ),
          React.createElement(View, { style: styles.metaItem },
            React.createElement(Text, { style: styles.metaLabel }, 'BETALINGSFRIST'),
            React.createElement(Text, { style: styles.metaValue }, formatDate(invoice.due_date))
          )
        )
      ),
      // Table
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: styles.tableCol1 }, 'PRODUKT'),
          React.createElement(Text, { style: styles.tableCol2 }, 'ENHEDER'),
          React.createElement(Text, { style: styles.tableCol3 }, 'ENHEDSPRIS'),
          React.createElement(Text, { style: styles.tableCol4 }, 'TOTAL')
        ),
        ...items.map((item, i) => {
          const qty = item.qty || 1;
          const unitPrice = item.unit_minor || 0;
          const discountPct = item.discount_pct || 0;
          
          // Calculate line total with discount
          const lineTotal = qty * unitPrice;
          const discountAmount = (lineTotal * discountPct) / 100;
          const totalAfterDiscount = lineTotal - discountAmount;
          
          // Build description with discount info if applicable
          let description = item.description || '—';
          if (discountPct > 0) {
            description += ` (${discountPct}% rabat)`;
          }
          
          return React.createElement(
            View,
            { key: i, style: [styles.tableRow, i % 2 === 0 && styles.tableRowEven] },
            React.createElement(Text, { style: styles.tableCol1 }, description),
            React.createElement(Text, { style: styles.tableCol2 }, String(qty)),
            React.createElement(Text, { style: styles.tableCol3 }, formatCurrency(unitPrice, currency)),
            React.createElement(Text, { style: styles.tableCol4 }, formatCurrency(totalAfterDiscount, currency))
          );
        })
      ),
      // Totals
        React.createElement(
          View,
          { style: styles.totals },
          React.createElement(
            View,
            { style: styles.totalsBody },
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(Text, null, 'Subtotal'),
            React.createElement(Text, null, formatCurrency(invoice.subtotal_minor || 0, currency))
          ),
          // Dynamic tax rates
          ...(() => {
            const taxRates = calculateTaxRates(items, invoice.subtotal_minor || 0, invoice.tax_minor || 0);
            return taxRates.map((tax, idx) => 
              React.createElement(
                View,
                { key: idx, style: styles.totalRow },
                React.createElement(Text, null, `Moms (${tax.rate}%)`),
                React.createElement(Text, null, formatCurrency(tax.amount, currency))
              )
            );
          })(),
          React.createElement(View, { style: styles.totalsDivider }),
          React.createElement(
            View,
            { style: [styles.totalRow, styles.totalFinal] },
            React.createElement(Text, null, 'Total'),
            React.createElement(Text, { style: styles.totalFinalAmount }, formatCurrency(invoice.total_minor || 0, currency))
          )
        )
      ),
      // Payment Terms
      (() => {
        // Calculate payment days from issue_date to due_date
        let paymentDays = 14; // Default
        if (invoice.issue_date && invoice.due_date) {
          const issueDate = new Date(invoice.issue_date);
          const dueDate = new Date(invoice.due_date);
          const diffTime = dueDate - issueDate;
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            paymentDays = diffDays;
          }
        }
        
        return React.createElement(
          View,
          { style: styles.paymentTermsSection },
          React.createElement(Text, { style: styles.paymentTermsTitle }, 'Betalingsbetingelser'),
          React.createElement(Text, { style: styles.paymentTermsText }, 
            invoice.due_date 
              ? `Betalingsbetingelser: Netto ${paymentDays} dage - Forfaldsdato: ${formatDate(invoice.due_date)}`
              : `Betalingsbetingelser: Netto ${paymentDays} dage`
          ),
        React.createElement(Text, { style: [styles.paymentTermsText, { marginTop: 8 }] }, 
          'Beløbet indbetales på bankkonto:'
        ),
        React.createElement(Text, { style: styles.paymentTermsText }, 
          'Nordea Bank / Reg.nr. 2415 / Kontonr. 0727499083'
        ),
          invoice.invoice_number ? React.createElement(Text, { style: [styles.paymentTermsText, { marginTop: 8 }] }, 
            `Fakturanr. ${invoice.invoice_number} bedes angivet ved bankoverførsel`
          ) : null,
          React.createElement(Text, { style: [styles.paymentTermsText, { marginTop: 8 }] }, 
            'Ved betaling efter forfald tilskrives der renter på 0,81%, pr. påbegyndt måned, samt et gebyr på 100,00 DKK.'
          )
        );
      })(),
      // Notes (if present)
      invoice.notes ? React.createElement(
        View,
        { style: styles.notesSection },
        React.createElement(Text, { style: styles.notesTitle }, 'Bemærkninger'),
        React.createElement(Text, { style: styles.notesText }, invoice.notes)
      ) : null,
      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, sellerFooter),
        React.createElement(Text, { 
          style: styles.footerText,
          render: ({ pageNumber, totalPages }) => `Side ${pageNumber} af ${totalPages}` 
        })
      )
    )
  );
};

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('[PDF-React] Request started');
    const { type, data } = JSON.parse(event.body || '{}');
    console.log('[PDF-React] Type:', type, 'ID:', data?.id);

    if (!type || !data || !data.id) {
      console.error('[PDF-React] Missing parameters');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing type or data.id' }),
      };
    }

    // Validate type
    if (!['quote', 'order', 'invoice'].includes(type)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Unsupported type: ${type}` }),
      };
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[PDF-React] Missing Supabase configuration', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      });
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Missing Supabase configuration',
          details: 'SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in Netlify environment variables',
          hint: process.env.NETLIFY_DEV 
            ? 'For local development: Create a .env file in project root with SUPABASE_URL and SUPABASE_SERVICE_KEY. See docs/NETLIFY_DEV_SETUP.md'
            : 'For production: Set in Netlify Dashboard → Site Settings → Environment Variables',
          availableEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
        }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[PDF-React] Supabase client initialized', {
      url: supabaseUrl,
      hasKey: !!supabaseKey,
      keyLength: supabaseKey?.length
    });

    // Determine table name
    const tableName = type === 'quote' ? 'quotes' : type === 'order' ? 'orders' : 'invoices';

    // Fetch document data
    console.log('[PDF-React] Fetching document from', tableName, 'with id:', data.id);
    
    let docData;
    try {
      const { data: fetchedData, error: docErr } = await supabase
        .from(tableName)
        .select(`*, company:companies(*), contact:people(*, company:companies(*)), deal:deals(*)`)
        .eq('id', data.id)
        .single();

      if (docErr) {
        console.error('[PDF-React] Supabase query error:', {
          message: docErr.message,
          details: docErr.details,
          hint: docErr.hint,
          code: docErr.code
        });
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
            details: docErr.message,
            hint: docErr.hint,
            code: docErr.code
          }),
        };
      }

      if (!fetchedData) {
        console.error('[PDF-React] Document data is null/undefined');
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
            details: 'No data returned from database'
          }),
        };
      }

      docData = fetchedData;
      console.log('[PDF-React] Document found:', {
        id: docData.id,
        hasCompany: !!docData.company,
        hasContact: !!docData.contact,
        hasDeal: !!docData.deal
      });
    } catch (queryError) {
      console.error('[PDF-React] Query exception:', {
        name: queryError.name,
        message: queryError.message,
        stack: queryError.stack
      });
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Failed to fetch document',
          details: queryError.message,
          errorType: queryError.name,
          stack: process.env.NODE_ENV === 'development' ? queryError.stack : undefined
        }),
      };
    }

    // Fetch line items
    console.log('[PDF-React] Fetching line items');
    let items = [];
    try {
      const { data: fetchedItems, error: itemsErr } = await supabase
        .from('line_items')
        .select('*')
        .eq('parent_type', type)
        .eq('parent_id', data.id)
        .order('position');

      if (itemsErr) {
        console.error('[PDF-React] Error fetching line items:', itemsErr.message);
        // Continue with empty items array rather than failing
        items = [];
      } else {
        items = fetchedItems || [];
      }
    } catch (itemsError) {
      console.error('[PDF-React] Exception fetching line items:', itemsError.message);
      // Continue with empty items array
      items = [];
    }

    console.log('[PDF-React] Found', items.length, 'line items');

    // Generate PDF using React PDF
    console.log('[PDF-React] Generating PDF with @react-pdf/renderer');
    
    let pdfBuffer;
    try {
      // Select the appropriate PDF generator based on type
      let pdfDoc;
      switch (type) {
        case 'quote':
          pdfDoc = createQuotePDF(docData, items);
          break;
        case 'order':
          pdfDoc = createOrderPDF(docData, items);
          break;
        case 'invoice':
          pdfDoc = createInvoicePDF(docData, items);
          break;
        default:
          throw new Error(`Unsupported document type: ${type}`);
      }
      
      // Convert stream to buffer
      console.log('[PDF-React] Rendering PDF to stream');
      const stream = await renderToStream(pdfDoc);
      const chunks = [];
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      pdfBuffer = Buffer.concat(chunks);
      console.log('[PDF-React] PDF generated, size:', pdfBuffer.length, 'bytes');
    } catch (pdfError) {
      console.error('[PDF-React] PDF generation error:', {
        name: pdfError.name,
        message: pdfError.message,
        stack: pdfError.stack
      });
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'PDF generation failed',
          details: pdfError.message,
          errorType: pdfError.name,
          hint: 'Check that all required document fields are present',
          stack: process.env.NODE_ENV === 'development' ? pdfError.stack : undefined
        }),
      };
    }

    // Convert to base64
    const base64Pdf = pdfBuffer.toString('base64');
    console.log('[PDF-React] Converted to base64, length:', base64Pdf.length);

    // Determine filename
    const docNumber = docData.number || docData.invoice_number || docData.order_number || docData.id.slice(-6);
    const filename = `${type}-${docNumber}.pdf`;

    console.log('[PDF-React] Returning response');

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        pdf: base64Pdf,
        filename: filename,
        size: pdfBuffer.length,
        contentType: 'application/pdf'
      }),
    };

  } catch (error) {
    console.error('[PDF-React] Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'PDF generation failed',
        details: error.message,
        errorType: error.name,
        stack: error.stack
      }),
    };
  }
};

