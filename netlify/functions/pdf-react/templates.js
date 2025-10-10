// React PDF Templates for Quote, Order, and Invoice
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Color scheme matching the brand
const COLORS = {
  primary: '#698BB5',
  dark: '#5E6367',
  green: '#98A095',
  lightGreen: '#C5CB9D',
  cream: '#ECE0CA',
  tan: '#CDBA9A',
  white: '#FFFFFF',
  lightGray: '#F8F6F0',
};

// Shared styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: COLORS.white,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: `2px solid ${COLORS.tan}`,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
    textAlign: 'right',
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metaColumn: {
    flex: 1,
  },
  metaItem: {
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 8,
    color: COLORS.dark,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  twoColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    paddingVertical: 15,
    borderBottom: `1px solid ${COLORS.tan}`,
  },
  column: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.dark,
  },
  columnText: {
    fontSize: 9,
    marginBottom: 3,
    color: COLORS.dark,
  },
  table: {
    marginVertical: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.tan,
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${COLORS.tan}`,
    padding: 8,
    fontSize: 8,
  },
  tableRowEven: {
    backgroundColor: COLORS.lightGray,
  },
  tableCol1: { flex: 3 },
  tableCol2: { flex: 1, textAlign: 'right' },
  tableCol3: { flex: 1, textAlign: 'right' },
  tableCol4: { flex: 1, textAlign: 'right' },
  tableEmpty: {
    padding: 15,
    textAlign: 'center',
    fontStyle: 'italic',
    backgroundColor: COLORS.cream,
  },
  totals: {
    marginTop: 20,
    marginLeft: 'auto',
    width: 200,
    border: `2px solid ${COLORS.tan}`,
    padding: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 9,
  },
  totalsDivider: {
    borderTop: `1px solid ${COLORS.tan}`,
    marginVertical: 8,
  },
  totalFinal: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTop: `1px solid ${COLORS.tan}`,
    fontSize: 7,
    color: COLORS.dark,
  },
});

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

// Quote PDF Document
export const QuotePDF = ({ quote, items }) => {
  const quoteDate = formatDate(quote.created_at);
  const validUntil = formatDate(quote.valid_until);
  const currency = quote.currency || 'DKK';

  const soldByLines = [
    quote.company?.name,
    quote.company?.address,
    `${quote.company?.postal_code || ''} ${quote.company?.city || ''}`.trim(),
    quote.company?.email,
    quote.company?.phone,
  ].filter(Boolean);

  const billToLines = [
    quote.person?.name || 'Kunde',
    quote.person?.email,
    quote.person?.phone,
  ].filter(Boolean);

  const companyFooter = [
    quote.company?.website,
    quote.company?.email,
    quote.company?.phone,
  ].filter(Boolean).join('  •  ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.companyName}>{quote.company?.name || 'VIRKSOMHED'}</Text>
            <Text style={styles.documentTitle}>TILBUD</Text>
          </View>
          <View style={styles.metadata}>
            <View style={styles.metaColumn}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>DATO</Text>
                <Text style={styles.metaValue}>{quoteDate}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>TILBUD NR.</Text>
                <Text style={styles.metaValue}>{quote.number || '-'}</Text>
              </View>
            </View>
            <View style={styles.metaColumn}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>GYLDIG TIL</Text>
                <Text style={styles.metaValue}>{validUntil}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>DEAL ID</Text>
                <Text style={styles.metaValue}>{quote.deal_id || '-'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Two Columns */}
        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>SOLGT AF</Text>
            {soldByLines.map((line, i) => (
              <Text key={i} style={styles.columnText}>{line}</Text>
            ))}
          </View>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>TILBUD TIL</Text>
            {billToLines.map((line, i) => (
              <Text key={i} style={styles.columnText}>{line}</Text>
            ))}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCol1}>PRODUKT</Text>
            <Text style={styles.tableCol2}>ENHEDER</Text>
            <Text style={styles.tableCol3}>ENHEDSPRIS</Text>
            <Text style={styles.tableCol4}>TOTAL</Text>
          </View>
          {items.length === 0 ? (
            <View style={styles.tableEmpty}>
              <Text>Ingen linjeposter</Text>
            </View>
          ) : (
            items.map((item, i) => {
              const qty = item.qty || 1;
              const unitPrice = item.unit_minor || 0;
              const total = qty * unitPrice;
              return (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
                  <Text style={styles.tableCol1}>{item.description || '—'}</Text>
                  <Text style={styles.tableCol2}>{qty}</Text>
                  <Text style={styles.tableCol3}>{formatCurrency(unitPrice, currency)}</Text>
                  <Text style={styles.tableCol4}>{formatCurrency(total, currency)}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(quote.subtotal_minor || 0, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Moms</Text>
            <Text>{formatCurrency(quote.tax_minor || 0, currency)}</Text>
          </View>
          <View style={styles.totalsDivider} />
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text>Total</Text>
            <Text>{formatCurrency(quote.total_minor || 0, currency)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{companyFooter}</Text>
          <Text render={({ pageNumber, totalPages }) => `Side ${pageNumber} af ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

// Invoice PDF Document
export const InvoicePDF = ({ invoice, items }) => {
  const invDate = formatDate(invoice.created_at);
  const currency = invoice.currency || 'DKK';

  const soldByLines = [
    invoice.company?.name,
    invoice.company?.address,
    `${invoice.company?.postal_code || ''} ${invoice.company?.city || ''}`.trim(),
    invoice.company?.email,
    invoice.company?.phone,
  ].filter(Boolean);

  const billToLines = [
    invoice.person?.name || 'Kunde',
    invoice.person?.email,
    invoice.person?.phone,
  ].filter(Boolean);

  const companyFooter = [
    invoice.company?.website,
    invoice.company?.email,
    invoice.company?.phone,
  ].filter(Boolean).join('  •  ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.companyName}>{invoice.company?.name || 'VIRKSOMHED'}</Text>
            <Text style={styles.documentTitle}>FAKTURA</Text>
          </View>
          <View style={styles.metadata}>
            <View style={styles.metaColumn}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>DATO</Text>
                <Text style={styles.metaValue}>{invDate}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>FAKTURA NR.</Text>
                <Text style={styles.metaValue}>{invoice.number || invoice.invoice_number || '-'}</Text>
              </View>
            </View>
            <View style={styles.metaColumn}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>BETALING</Text>
                <Text style={styles.metaValue}>{invoice.paid_by || invoice.payment_method || '-'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>ORDRE ID</Text>
                <Text style={styles.metaValue}>{invoice.order_id || '-'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>SOLGT AF</Text>
            {soldByLines.map((line, i) => (
              <Text key={i} style={styles.columnText}>{line}</Text>
            ))}
          </View>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>FAKTURERES TIL</Text>
            {billToLines.map((line, i) => (
              <Text key={i} style={styles.columnText}>{line}</Text>
            ))}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCol1}>PRODUKT</Text>
            <Text style={styles.tableCol2}>ENHEDER</Text>
            <Text style={styles.tableCol3}>ENHEDSPRIS</Text>
            <Text style={styles.tableCol4}>TOTAL</Text>
          </View>
          {items.length === 0 ? (
            <View style={styles.tableEmpty}>
              <Text>Ingen linjeposter</Text>
            </View>
          ) : (
            items.map((item, i) => {
              const qty = item.qty || 1;
              const unitPrice = item.unit_minor || 0;
              const total = qty * unitPrice;
              return (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
                  <Text style={styles.tableCol1}>{item.description || '—'}</Text>
                  <Text style={styles.tableCol2}>{qty}</Text>
                  <Text style={styles.tableCol3}>{formatCurrency(unitPrice, currency)}</Text>
                  <Text style={styles.tableCol4}>{formatCurrency(total, currency)}</Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(invoice.subtotal_minor || 0, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Moms</Text>
            <Text>{formatCurrency(invoice.tax_minor || 0, currency)}</Text>
          </View>
          <View style={styles.totalsDivider} />
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text>Total</Text>
            <Text>{formatCurrency(invoice.total_minor || 0, currency)}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{companyFooter}</Text>
          <Text render={({ pageNumber, totalPages }) => `Side ${pageNumber} af ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

// Order PDF Document
export const OrderPDF = ({ order, items }) => {
  const orderDate = formatDate(order.created_at);
  const currency = order.currency || 'DKK';

  const soldByLines = [
    order.company?.name,
    order.company?.address,
    `${order.company?.postal_code || ''} ${order.company?.city || ''}`.trim(),
    order.company?.email,
    order.company?.phone,
  ].filter(Boolean);

  const billToLines = [
    order.person?.name || 'Kunde',
    order.person?.email,
    order.person?.phone,
  ].filter(Boolean);

  const companyFooter = [
    order.company?.website,
    order.company?.email,
    order.company?.phone,
  ].filter(Boolean).join('  •  ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.companyName}>{order.company?.name || 'VIRKSOMHED'}</Text>
            <Text style={styles.documentTitle}>ORDRE</Text>
          </View>
          <View style={styles.metadata}>
            <View style={styles.metaColumn}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>DATO</Text>
                <Text style={styles.metaValue}>{orderDate}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>ORDRE NR.</Text>
                <Text style={styles.metaValue}>{order.number || order.order_number || '-'}</Text>
              </View>
            </View>
            <View style={styles.metaColumn}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>DEAL ID</Text>
                <Text style={styles.metaValue}>{order.deal_id || '-'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>STATUS</Text>
                <Text style={styles.metaValue}>{order.status || '-'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>SOLGT AF</Text>
            {soldByLines.map((line, i) => (
              <Text key={i} style={styles.columnText}>{line}</Text>
            ))}
          </View>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>ORDRE TIL</Text>
            {billToLines.map((line, i) => (
              <Text key={i} style={styles.columnText}>{line}</Text>
            ))}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCol1}>PRODUKT</Text>
            <Text style={styles.tableCol2}>ENHEDER</Text>
            <Text style={styles.tableCol3}>ENHEDSPRIS</Text>
            <Text style={styles.tableCol4}>TOTAL</Text>
          </View>
          {items.length === 0 ? (
            <View style={styles.tableEmpty}>
              <Text>Ingen linjeposter</Text>
            </View>
          ) : (
            items.map((item, i) => {
              const qty = item.qty || 1;
              const unitPrice = item.unit_minor || 0;
              const total = qty * unitPrice;
              return (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
                  <Text style={styles.tableCol1}>{item.description || '—'}</Text>
                  <Text style={styles.tableCol2}>{qty}</Text>
                  <Text style={styles.tableCol3}>{formatCurrency(unitPrice, currency)}</Text>
                  <Text style={styles.tableCol4}>{formatCurrency(total, currency)}</Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(order.subtotal_minor || 0, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Moms</Text>
            <Text>{formatCurrency(order.tax_minor || 0, currency)}</Text>
          </View>
          <View style={styles.totalsDivider} />
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text>Total</Text>
            <Text>{formatCurrency(order.total_minor || 0, currency)}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{companyFooter}</Text>
          <Text render={({ pageNumber, totalPages}) => `Side ${pageNumber} af ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

