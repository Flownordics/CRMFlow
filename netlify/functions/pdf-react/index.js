// Netlify Function - React PDF Generator
import { createClient } from '@supabase/supabase-js';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { QuotePDF, InvoicePDF, OrderPDF } from './templates.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      console.error('[PDF-React] Missing Supabase configuration');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing Supabase configuration' }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[PDF-React] Supabase client initialized');

    // Determine table name
    const tableName = type === 'quote' ? 'quotes' : type === 'order' ? 'orders' : 'invoices';

    // Fetch document data
    console.log('[PDF-React] Fetching document from', tableName);
    const { data: docData, error: docErr } = await supabase
      .from(tableName)
      .select(`*, company:companies(*), person:people(*), deal:deals(*)`)
      .eq('id', data.id)
      .single();

    if (docErr || !docData) {
      console.error('[PDF-React] Document not found:', docErr?.message);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
          details: docErr?.message
        }),
      };
    }

    console.log('[PDF-React] Document found:', docData.id);

    // Fetch line items
    console.log('[PDF-React] Fetching line items');
    const { data: items = [] } = await supabase
      .from('line_items')
      .select('*')
      .eq('parent_type', type)
      .eq('parent_id', data.id)
      .order('position');

    console.log('[PDF-React] Found', items.length, 'line items');

    // Select appropriate template
    let PDFComponent;
    switch (type) {
      case 'quote':
        PDFComponent = QuotePDF;
        break;
      case 'order':
        PDFComponent = OrderPDF;
        break;
      case 'invoice':
        PDFComponent = InvoicePDF;
        break;
    }

    // Generate PDF using React PDF
    console.log('[PDF-React] Generating PDF with @react-pdf/renderer');
    const pdfBuffer = await renderToBuffer(
      React.createElement(PDFComponent, { [type]: docData, items })
    );

    console.log('[PDF-React] PDF generated, size:', pdfBuffer.length, 'bytes');

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

