// HTML Templates for PDF Generation
// Modern, clean design matching the current color scheme

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

const formatCurrency = (value, currency = 'DKK') => {
    return new Intl.NumberFormat('da-DK', {
        style: 'currency',
        currency: currency
    }).format(value / 100);
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('da-DK');
};

const baseStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
    
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    
    body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 10pt;
        color: ${COLORS.dark};
        line-height: 1.4;
        background: ${COLORS.white};
    }
    
    .page {
        width: 210mm;
        min-height: 297mm;
        padding: 15mm 15mm;
        background: ${COLORS.white};
        position: relative;
    }
    
    /* Header */
    .header {
        position: relative;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid ${COLORS.tan};
    }
    
    .header-accent {
        position: absolute;
        left: -18px;
        top: 0;
        width: 8px;
        height: 100%;
        background: ${COLORS.tan};
    }
    
    .header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
    }
    
    .logo {
        max-height: 50px;
        max-width: 180px;
    }
    
    .company-name {
        font-size: 22pt;
        font-weight: 700;
        color: ${COLORS.dark};
    }
    
    .document-title {
        font-size: 28pt;
        font-weight: 700;
        color: ${COLORS.dark};
        text-align: right;
    }
    
    /* Metadata grid */
    .metadata {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-top: 15px;
    }
    
    .meta-item {
        margin-bottom: 12px;
    }
    
    .meta-label {
        font-size: 9pt;
        color: ${COLORS.dark};
        margin-bottom: 4px;
        font-weight: 400;
    }
    
    .meta-value {
        font-size: 11pt;
        font-weight: 700;
        color: ${COLORS.dark};
    }
    
    /* Two column section */
    .two-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin: 25px 0;
        padding: 20px 0;
        border-bottom: 1px solid ${COLORS.tan};
    }
    
    .column-title {
        font-size: 11pt;
        font-weight: 700;
        margin-bottom: 10px;
        color: ${COLORS.dark};
    }
    
    .column-text {
        font-size: 10pt;
        margin-bottom: 4px;
        color: ${COLORS.dark};
    }
    
    /* Table */
    .table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
    }
    
    .table-header {
        background: ${COLORS.tan};
        font-weight: 700;
        font-size: 10pt;
    }
    
    .table-header th {
        padding: 12px 10px;
        text-align: left;
    }
    
    .table-header th:nth-child(2),
    .table-header th:nth-child(3),
    .table-header th:nth-child(4) {
        text-align: right;
    }
    
    .table-row {
        border-bottom: 1px solid ${COLORS.tan};
    }
    
    .table-row:nth-child(even) {
        background: ${COLORS.lightGray};
    }
    
    .table-row:nth-child(odd) {
        background: ${COLORS.white};
    }
    
    .table-row td {
        padding: 10px;
        font-size: 9pt;
    }
    
    .table-row td:nth-child(2),
    .table-row td:nth-child(3),
    .table-row td:nth-child(4) {
        text-align: right;
    }
    
    .table-empty {
        background: ${COLORS.cream} !important;
        text-align: center;
        font-style: italic;
        padding: 15px !important;
    }
    
    /* Totals */
    .totals-container {
        margin: 30px 0 0 auto;
        width: 320px;
        border: 2px solid ${COLORS.tan};
        padding: 20px;
        background: ${COLORS.white};
    }
    
    .totals-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        font-size: 10pt;
    }
    
    .totals-divider {
        border-top: 1px solid ${COLORS.tan};
        margin: 12px 0;
    }
    
    .totals-total {
        font-size: 13pt;
        font-weight: 700;
    }
    
    /* Footer */
    .footer {
        position: fixed;
        bottom: 15mm;
        left: 15mm;
        right: 15mm;
        padding-top: 15px;
        border-top: 1px solid ${COLORS.tan};
        font-size: 8pt;
        display: flex;
        justify-content: space-between;
        color: ${COLORS.dark};
    }
    
    /* Print styles */
    @media print {
        .page {
            margin: 0;
            padding: 15mm;
        }
    }
`;

// Quote HTML Template
export const generateQuoteHTML = (quote, items) => {
    const quoteDate = formatDate(quote.created_at);
    const validUntil = quote.valid_until ? formatDate(quote.valid_until) : '-';
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
    
    const itemsHTML = items.length === 0
        ? '<tr><td colspan="4" class="table-empty">Ingen linjeposter</td></tr>'
        : items.map(item => {
            const qty = item.qty || 1;
            const unitPrice = item.unit_minor || 0;
            const total = qty * unitPrice;
            return `
                <tr class="table-row">
                    <td>${item.description || '—'}</td>
                    <td>${qty}</td>
                    <td>${formatCurrency(unitPrice, currency)}</td>
                    <td>${formatCurrency(total, currency)}</td>
                </tr>
            `;
        }).join('');
    
    return `
<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tilbud ${quote.number || ''}</title>
    <style>${baseStyles}</style>
</head>
<body>
    <div class="page">
        <!-- Header -->
        <div class="header">
            <div class="header-accent"></div>
            <div class="header-top">
                <div>
                    ${quote.company?.logo_url 
                        ? `<img src="${quote.company.logo_url}" alt="${quote.company.name}" class="logo" />`
                        : `<div class="company-name">${quote.company?.name || 'VIRKSOMHED'}</div>`
                    }
                </div>
                <div class="document-title">TILBUD</div>
            </div>
            <div class="metadata">
                <div>
                    <div class="meta-item">
                        <div class="meta-label">DATO</div>
                        <div class="meta-value">${quoteDate}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">TILBUD NR.</div>
                        <div class="meta-value">${quote.number || '-'}</div>
                    </div>
                </div>
                <div>
                    <div class="meta-item">
                        <div class="meta-label">GYLDIG TIL</div>
                        <div class="meta-value">${validUntil}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">DEAL ID</div>
                        <div class="meta-value">${quote.deal_id || '-'}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Two Columns -->
        <div class="two-columns">
            <div>
                <div class="column-title">SOLGT AF</div>
                ${soldByLines.map(line => `<div class="column-text">${line}</div>`).join('')}
            </div>
            <div>
                <div class="column-title">TILBUD TIL</div>
                ${billToLines.map(line => `<div class="column-text">${line}</div>`).join('')}
            </div>
        </div>
        
        <!-- Items Table -->
        <table class="table">
            <thead class="table-header">
                <tr>
                    <th>PRODUKT</th>
                    <th>ENHEDER</th>
                    <th>ENHEDSPRIS</th>
                    <th>TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals-container">
            <div class="totals-row">
                <span>Subtotal</span>
                <span>${formatCurrency(quote.subtotal_minor || 0, currency)}</span>
            </div>
            <div class="totals-row">
                <span>Moms</span>
                <span>${formatCurrency(quote.tax_minor || 0, currency)}</span>
            </div>
            <div class="totals-divider"></div>
            <div class="totals-row totals-total">
                <span>Total</span>
                <span>${formatCurrency(quote.total_minor || 0, currency)}</span>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <span>${companyFooter}</span>
            <span>Side 1</span>
        </div>
    </div>
</body>
</html>
    `.trim();
};

// Invoice HTML Template
export const generateInvoiceHTML = (invoice, items) => {
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
    
    const itemsHTML = items.length === 0
        ? '<tr><td colspan="4" class="table-empty">Ingen linjeposter</td></tr>'
        : items.map(item => {
            const qty = item.qty || 1;
            const unitPrice = item.unit_minor || 0;
            const total = qty * unitPrice;
            return `
                <tr class="table-row">
                    <td>${item.description || '—'}</td>
                    <td>${qty}</td>
                    <td>${formatCurrency(unitPrice, currency)}</td>
                    <td>${formatCurrency(total, currency)}</td>
                </tr>
            `;
        }).join('');
    
    return `
<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Faktura ${invoice.number || ''}</title>
    <style>${baseStyles}</style>
</head>
<body>
    <div class="page">
        <!-- Header -->
        <div class="header">
            <div class="header-accent"></div>
            <div class="header-top">
                <div>
                    ${invoice.company?.logo_url 
                        ? `<img src="${invoice.company.logo_url}" alt="${invoice.company.name}" class="logo" />`
                        : `<div class="company-name">${invoice.company?.name || 'VIRKSOMHED'}</div>`
                    }
                </div>
                <div class="document-title">FAKTURA</div>
            </div>
            <div class="metadata">
                <div>
                    <div class="meta-item">
                        <div class="meta-label">DATO</div>
                        <div class="meta-value">${invDate}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">FAKTURA NR.</div>
                        <div class="meta-value">${invoice.number || invoice.invoice_number || '-'}</div>
                    </div>
                </div>
                <div>
                    <div class="meta-item">
                        <div class="meta-label">BETALING</div>
                        <div class="meta-value">${invoice.paid_by || invoice.payment_method || '-'}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">ORDRE ID</div>
                        <div class="meta-value">${invoice.order_id || '-'}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Two Columns -->
        <div class="two-columns">
            <div>
                <div class="column-title">SOLGT AF</div>
                ${soldByLines.map(line => `<div class="column-text">${line}</div>`).join('')}
            </div>
            <div>
                <div class="column-title">FAKTURERES TIL</div>
                ${billToLines.map(line => `<div class="column-text">${line}</div>`).join('')}
            </div>
        </div>
        
        <!-- Items Table -->
        <table class="table">
            <thead class="table-header">
                <tr>
                    <th>PRODUKT</th>
                    <th>ENHEDER</th>
                    <th>ENHEDSPRIS</th>
                    <th>TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals-container">
            <div class="totals-row">
                <span>Subtotal</span>
                <span>${formatCurrency(invoice.subtotal_minor || 0, currency)}</span>
            </div>
            <div class="totals-row">
                <span>Moms</span>
                <span>${formatCurrency(invoice.tax_minor || 0, currency)}</span>
            </div>
            <div class="totals-divider"></div>
            <div class="totals-row totals-total">
                <span>Total</span>
                <span>${formatCurrency(invoice.total_minor || 0, currency)}</span>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <span>${companyFooter}</span>
            <span>Side 1</span>
        </div>
    </div>
</body>
</html>
    `.trim();
};

// Order HTML Template (similar to invoice but with "ORDRE" title)
export const generateOrderHTML = (order, items) => {
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
    
    const itemsHTML = items.length === 0
        ? '<tr><td colspan="4" class="table-empty">Ingen linjeposter</td></tr>'
        : items.map(item => {
            const qty = item.qty || 1;
            const unitPrice = item.unit_minor || 0;
            const total = qty * unitPrice;
            return `
                <tr class="table-row">
                    <td>${item.description || '—'}</td>
                    <td>${qty}</td>
                    <td>${formatCurrency(unitPrice, currency)}</td>
                    <td>${formatCurrency(total, currency)}</td>
                </tr>
            `;
        }).join('');
    
    return `
<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ordre ${order.number || ''}</title>
    <style>${baseStyles}</style>
</head>
<body>
    <div class="page">
        <!-- Header -->
        <div class="header">
            <div class="header-accent"></div>
            <div class="header-top">
                <div>
                    ${order.company?.logo_url 
                        ? `<img src="${order.company.logo_url}" alt="${order.company.name}" class="logo" />`
                        : `<div class="company-name">${order.company?.name || 'VIRKSOMHED'}</div>`
                    }
                </div>
                <div class="document-title">ORDRE</div>
            </div>
            <div class="metadata">
                <div>
                    <div class="meta-item">
                        <div class="meta-label">DATO</div>
                        <div class="meta-value">${orderDate}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">ORDRE NR.</div>
                        <div class="meta-value">${order.number || order.order_number || '-'}</div>
                    </div>
                </div>
                <div>
                    <div class="meta-item">
                        <div class="meta-label">DEAL ID</div>
                        <div class="meta-value">${order.deal_id || '-'}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">STATUS</div>
                        <div class="meta-value">${order.status || '-'}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Two Columns -->
        <div class="two-columns">
            <div>
                <div class="column-title">SOLGT AF</div>
                ${soldByLines.map(line => `<div class="column-text">${line}</div>`).join('')}
            </div>
            <div>
                <div class="column-title">ORDRE TIL</div>
                ${billToLines.map(line => `<div class="column-text">${line}</div>`).join('')}
            </div>
        </div>
        
        <!-- Items Table -->
        <table class="table">
            <thead class="table-header">
                <tr>
                    <th>PRODUKT</th>
                    <th>ENHEDER</th>
                    <th>ENHEDSPRIS</th>
                    <th>TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals-container">
            <div class="totals-row">
                <span>Subtotal</span>
                <span>${formatCurrency(order.subtotal_minor || 0, currency)}</span>
            </div>
            <div class="totals-row">
                <span>Moms</span>
                <span>${formatCurrency(order.tax_minor || 0, currency)}</span>
            </div>
            <div class="totals-divider"></div>
            <div class="totals-row totals-total">
                <span>Total</span>
                <span>${formatCurrency(order.total_minor || 0, currency)}</span>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <span>${companyFooter}</span>
            <span>Side 1</span>
        </div>
    </div>
</body>
</html>
    `.trim();
};

