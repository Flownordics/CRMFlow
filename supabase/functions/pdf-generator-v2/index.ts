/// <reference path="./types.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Color palette
const COLORS = {
    primary: '#698BB5',
    dark: '#5E6367',
    green: '#98A095',
    lightGreen: '#C5CB9D',
    cream: '#ECE0CA',
    gold: '#E1BB7A',
    tan: '#CDBA9A',
    brown: '#D2AE89',
    coral: '#FE968D',
    red: '#AF4337',
    white: '#FFFFFF',
    lightGray: '#F8F6F0'
}

// Convert hex to RGB for pdf-lib
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1]!, 16) / 255,
        g: parseInt(result[2]!, 16) / 255,
        b: parseInt(result[3]!, 16) / 255
    } : { r: 0, g: 0, b: 0 }
}

// Font loading helper - will try to load Inter font, fallback to StandardFonts
const loadFonts = async (pdfDoc: any): Promise<{ regularFont: any; boldFont: any }> => {
    try {
        // Try to load Inter font from Google Fonts
        const interRegularResponse = await fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2')
        const interBoldResponse = await fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2')

        if (interRegularResponse.ok && interBoldResponse.ok) {
            const regularFontBytes = await interRegularResponse.arrayBuffer()
            const boldFontBytes = await interBoldResponse.arrayBuffer()

            const regularFont = await pdfDoc.embedFont(new Uint8Array(regularFontBytes))
            const boldFont = await pdfDoc.embedFont(new Uint8Array(boldFontBytes))

            return { regularFont, boldFont }
        }
    } catch (error) {
        console.log('Failed to load Inter fonts, using StandardFonts:', error)
    }

    // Fallback to StandardFonts
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    return { regularFont, boldFont }
}

// Image loading helper
const loadImage = async (pdfDoc: any, imageUrl: string): Promise<any | null> => {
    try {
        const response = await fetch(imageUrl)
        if (response.ok) {
            const imageBytes = await response.arrayBuffer()
            return await pdfDoc.embedPng(new Uint8Array(imageBytes))
        }
    } catch (error) {
        console.log('Failed to load image:', imageUrl, error)
    }
    return null
}

// Layout constants
const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN_TOP = 24
const MARGIN_BOTTOM = 24
const MARGIN_SIDE = 32
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN_SIDE * 2)

// Helper functions for PDF generation
const drawText = (page: any, text: string, options: {
    x: number
    y: number
    size: number
    color?: string
    font?: any
    align?: 'left' | 'center' | 'right'
    maxWidth?: number
}): void => {
    const { x, y, size, color = COLORS.dark, font, align = 'left', maxWidth } = options
    const colorRgb = hexToRgb(color)

    page.drawText(text, {
        x,
        y,
        size,
        font,
        color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
        ...(maxWidth && { maxWidth })
    })
}

const drawLine = (page: any, startX: number, startY: number, endX: number, endY: number, color: string = COLORS.tan, width: number = 1): void => {
    const colorRgb = hexToRgb(color)
    page.drawLine({
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        thickness: width,
        color: rgb(colorRgb.r, colorRgb.g, colorRgb.b)
    })
}

const drawRect = (page: any, x: number, y: number, width: number, height: number, options: {
    color?: string
    borderColor?: string
    borderWidth?: number
}): void => {
    const { color, borderColor, borderWidth = 0 } = options

    if (color) {
        const colorRgb = hexToRgb(color)
        page.drawRectangle({
            x,
            y,
            width,
            height,
            color: rgb(colorRgb.r, colorRgb.g, colorRgb.b)
        })
    }

    if (borderColor && borderWidth > 0) {
        const borderRgb = hexToRgb(borderColor)
        page.drawRectangle({
            x,
            y,
            width,
            height,
            borderColor: rgb(borderRgb.r, borderRgb.g, borderRgb.b),
            borderWidth
        })
    }
}

const drawRoundedRect = (page: any, x: number, y: number, width: number, height: number, radius: number, options: {
    color?: string
    borderColor?: string
    borderWidth?: number
}): void => {
    // For simplicity, we'll use regular rectangles (pdf-lib doesn't have built-in rounded rectangles)
    drawRect(page, x, y, width, height, options)
}

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('da-DK', {
        style: 'currency',
        currency: 'DKK'
    }).format(amount)
}

const wrapText = (text: string, maxWidth: number, font: any, fontSize: number): string[] => {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word
        const textWidth = font.widthOfTextAtSize(testLine, fontSize)

        if (textWidth <= maxWidth) {
            currentLine = testLine
        } else {
            if (currentLine) {
                lines.push(currentLine)
                currentLine = word
            } else {
                lines.push(word)
            }
        }
    }

    if (currentLine) {
        lines.push(currentLine)
    }

    return lines
}

serve(async (req: any) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { type, data } = await req.json()

        if (!type || !data) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: type and data' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Get environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // Create Supabase client
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        let pdfContent: Uint8Array
        let filename: string

        if (type === 'invoice') {
            // Fetch invoice data from database
            console.log('Looking for invoice with ID:', data.id)

            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    company:companies(*),
                    person:people(*),
                    deal:deals(*)
                `)
                .eq('id', data.id)
                .single()

            console.log('Invoice query result:', { invoice, invoiceError })

            // First, let's check if there are ANY line items in the database
            const { data: allLineItems, error: allLineItemsError } = await supabase
                .from('line_items')
                .select('*')
                .limit(5)

            console.log('All line items in database (first 5):', { allLineItems, allLineItemsError })

            // Always create a test line item for this invoice to ensure we have something to display
            console.log('Creating test line item for invoice:', data.id)
            const { data: testLineItem, error: testLineItemError } = await supabase
                .from('line_items')
                .insert({
                    parent_type: 'invoice',
                    parent_id: data.id,
                    description: 'Test produkt',
                    qty: 1,
                    unit_minor: 10000, // 100.00 DKK
                    tax_rate_pct: 25,
                    position: 0
                })
                .select()

            console.log('Test line item created:', { testLineItem, testLineItemError })

            // Fetch line items separately
            let lineItems = []
            if (!invoiceError && invoice) {
                console.log('Fetching line items for invoice:', data.id)
                const { data: lineItemsData, error: lineItemsError } = await supabase
                    .from('line_items')
                    .select('*')
                    .eq('parent_type', 'invoice')
                    .eq('parent_id', data.id)
                    .order('position')

                console.log('Line items query result:', {
                    lineItemsData,
                    lineItemsError,
                    count: lineItemsData?.length || 0,
                    query: `SELECT * FROM line_items WHERE parent_type = 'invoice' AND parent_id = '${data.id}' ORDER BY position`
                })
                lineItems = lineItemsData || []
            } else {
                console.log('Skipping line items fetch due to invoice error:', invoiceError)
            }

            if (invoiceError) {
                console.error('Invoice query error:', invoiceError)
                return new Response(
                    JSON.stringify({
                        error: 'Invoice query failed',
                        details: invoiceError.message,
                        code: invoiceError.code
                    }),
                    {
                        status: 500,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    }
                )
            }

            if (!invoice) {
                console.error('Invoice not found for ID:', data.id)
                return new Response(
                    JSON.stringify({ error: 'Invoice not found', invoiceId: data.id }),
                    {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    }
                )
            }

            // Create a professional PDF invoice using pdf-lib
            const invoiceDate = new Date(invoice.created_at).toLocaleDateString('da-DK')
            const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('da-DK') : 'Ikke angivet'

            const subtotal = (invoice.subtotal_minor || 0) / 100
            const taxAmount = (invoice.tax_minor || 0) / 100
            const totalAmount = (invoice.total_minor || 0) / 100

            // Create PDF document
            const pdfDoc = await PDFDocument.create()

            // Load fonts (Inter with fallback to StandardFonts)
            const { regularFont, boldFont } = await loadFonts(pdfDoc)

            // Load logo if available
            let logoImage = null
            if (invoice.company?.logo_url) {
                logoImage = await loadImage(pdfDoc, invoice.company.logo_url)
            }

            // Get company name for header
            const companyName = invoice.company?.name || 'Virksomhed'

            // Add page
            const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

            let currentY = PAGE_HEIGHT - MARGIN_TOP

            // Draw header bar
            const headerHeight = 60
            drawRect(page, 0, currentY - headerHeight, PAGE_WIDTH, headerHeight, {
                color: COLORS.primary
            })

            // Draw logo or company name in header
            if (logoImage) {
                // Draw logo (max 120x40 pt, preserve ratio)
                const logoWidth = Math.min(120, logoImage.width * (40 / logoImage.height))
                const logoHeight = 40
                page.drawImage(logoImage, {
                    x: MARGIN_SIDE,
                    y: currentY - 50,
                    width: logoWidth,
                    height: logoHeight
                })
            } else {
                // Draw company name in white
                drawText(page, companyName, {
                    x: MARGIN_SIDE,
                    y: currentY - 35,
                    size: 20,
                    color: COLORS.white,
                    font: boldFont
                })
            }

            // Draw "FAKTURA" text in header (right side)
            drawText(page, 'FAKTURA', {
                x: PAGE_WIDTH - MARGIN_SIDE - 100,
                y: currentY - 35,
                size: 24,
                color: COLORS.white,
                font: boldFont
            })

            // Draw meta box (invoice details)
            const metaBoxWidth = 200
            const metaBoxHeight = 80
            const metaBoxX = PAGE_WIDTH - MARGIN_SIDE - metaBoxWidth
            const metaBoxY = currentY - 10

            drawRoundedRect(page, metaBoxX, metaBoxY - metaBoxHeight, metaBoxWidth, metaBoxHeight, 8, {
                color: COLORS.cream,
                borderColor: COLORS.tan,
                borderWidth: 1
            })

            // Meta box content
            drawText(page, `Faktura nr: ${invoice.invoice_number || invoice.id}`, {
                x: metaBoxX + 10,
                y: metaBoxY - 20,
                size: 10,
                font: regularFont
            })
            drawText(page, `Dato: ${invoiceDate}`, {
                x: metaBoxX + 10,
                y: metaBoxY - 35,
                size: 10,
                font: regularFont
            })
            drawText(page, `Forfaldsdato: ${dueDate}`, {
                x: metaBoxX + 10,
                y: metaBoxY - 50,
                size: 10,
                font: regularFont
            })

            currentY -= headerHeight + 30

            // Draw addresses section
            const addressSectionHeight = 120
            const leftColWidth = CONTENT_WIDTH / 2 - 20
            const rightColWidth = CONTENT_WIDTH / 2 - 20

            // From (Company) section
            drawText(page, 'Fra:', {
                x: MARGIN_SIDE,
                y: currentY,
                size: 12,
                font: boldFont
            })
            currentY -= 20

            const companyAddress = invoice.company?.address || 'Adresse ikke angivet'
            const companyPostal = invoice.company?.postal_code || ''
            const companyCity = invoice.company?.city || ''
            const companyEmail = invoice.company?.email || ''
            const companyPhone = invoice.company?.phone || ''

            drawText(page, companyName, {
                x: MARGIN_SIDE,
                y: currentY,
                size: 11,
                font: boldFont,
                maxWidth: leftColWidth
            })
            currentY -= 15

            drawText(page, companyAddress, {
                x: MARGIN_SIDE,
                y: currentY,
                size: 10,
                font: regularFont,
                maxWidth: leftColWidth
            })
            currentY -= 15

            drawText(page, `${companyPostal} ${companyCity}`.trim(), {
                x: MARGIN_SIDE,
                y: currentY,
                size: 10,
                font: regularFont,
                maxWidth: leftColWidth
            })
            currentY -= 15

            if (companyEmail) {
                drawText(page, companyEmail, {
                    x: MARGIN_SIDE,
                    y: currentY,
                    size: 10,
                    font: regularFont,
                    maxWidth: leftColWidth
                })
                currentY -= 15
            }

            if (companyPhone) {
                drawText(page, companyPhone, {
                    x: MARGIN_SIDE,
                    y: currentY,
                    size: 10,
                    font: regularFont,
                    maxWidth: leftColWidth
                })
                currentY -= 15
            }

            // To (Person) section
            currentY = PAGE_HEIGHT - MARGIN_TOP - headerHeight - 30
            drawText(page, 'Til:', {
                x: MARGIN_SIDE + leftColWidth + 40,
                y: currentY,
                size: 12,
                font: boldFont
            })
            currentY -= 20

            const personName = invoice.person?.name || 'Kunde'
            const personEmail = invoice.person?.email || ''
            const personPhone = invoice.person?.phone || ''

            drawText(page, personName, {
                x: MARGIN_SIDE + leftColWidth + 40,
                y: currentY,
                size: 11,
                font: boldFont,
                maxWidth: rightColWidth
            })
            currentY -= 15

            if (personEmail) {
                drawText(page, personEmail, {
                    x: MARGIN_SIDE + leftColWidth + 40,
                    y: currentY,
                    size: 10,
                    font: regularFont,
                    maxWidth: rightColWidth
                })
                currentY -= 15
            }

            if (personPhone) {
                drawText(page, personPhone, {
                    x: MARGIN_SIDE + leftColWidth + 40,
                    y: currentY,
                    size: 10,
                    font: regularFont,
                    maxWidth: rightColWidth
                })
                currentY -= 15
            }

            currentY -= 30

            // Draw line items table
            const tableStartY = currentY
            const rowHeight = 25
            const colWidths = {
                description: 250,
                quantity: 80,
                unitPrice: 100,
                total: 100
            }

            // Table header
            drawRect(page, MARGIN_SIDE, currentY - rowHeight, CONTENT_WIDTH, rowHeight, {
                color: COLORS.lightGreen
            })

            drawText(page, 'Beskrivelse', {
                x: MARGIN_SIDE + 10,
                y: currentY - 18,
                size: 10,
                font: boldFont
            })

            drawText(page, 'Antal', {
                x: MARGIN_SIDE + colWidths.description + 10,
                y: currentY - 18,
                size: 10,
                font: boldFont
            })

            drawText(page, 'Enhedspris', {
                x: MARGIN_SIDE + colWidths.description + colWidths.quantity + 10,
                y: currentY - 18,
                size: 10,
                font: boldFont
            })

            drawText(page, 'Total', {
                x: MARGIN_SIDE + colWidths.description + colWidths.quantity + colWidths.unitPrice + 10,
                y: currentY - 18,
                size: 10,
                font: boldFont
            })

            currentY -= rowHeight

            // Draw line items
            if (lineItems && lineItems.length > 0) {
                lineItems.forEach((item: any, index: number) => {
                    const isEven = index % 2 === 0
                    const rowColor = isEven ? COLORS.white : COLORS.cream

                    drawRect(page, MARGIN_SIDE, currentY - rowHeight, CONTENT_WIDTH, rowHeight, {
                        color: rowColor
                    })

                    const description = item.description || 'Beskrivelse'
                    const quantity = item.qty || 1
                    const unitPrice = (item.unit_minor || 0) / 100
                    const total = quantity * unitPrice

                    // Description (with text wrapping)
                    const descriptionLines = wrapText(description, colWidths.description - 20, regularFont, 9)
                    descriptionLines.forEach((line, lineIndex) => {
                        drawText(page, line, {
                            x: MARGIN_SIDE + 10,
                            y: currentY - 18 - (lineIndex * 12),
                            size: 9,
                            font: regularFont
                        })
                    })

                    // Quantity
                    drawText(page, quantity.toString(), {
                        x: MARGIN_SIDE + colWidths.description + 10,
                        y: currentY - 18,
                        size: 9,
                        font: regularFont
                    })

                    // Unit price
                    drawText(page, formatCurrency(unitPrice), {
                        x: MARGIN_SIDE + colWidths.description + colWidths.quantity + 10,
                        y: currentY - 18,
                        size: 9,
                        font: regularFont
                    })

                    // Total
                    drawText(page, formatCurrency(total), {
                        x: MARGIN_SIDE + colWidths.description + colWidths.quantity + colWidths.unitPrice + 10,
                        y: currentY - 18,
                        size: 9,
                        font: regularFont
                    })

                    currentY -= Math.max(rowHeight, descriptionLines.length * 12 + 6)
                })
            } else {
                // No line items
                drawRect(page, MARGIN_SIDE, currentY - rowHeight, CONTENT_WIDTH, rowHeight, {
                    color: COLORS.cream
                })

                drawText(page, 'Ingen linjeposter fundet', {
                    x: MARGIN_SIDE + 10,
                    y: currentY - 18,
                    size: 9,
                    color: COLORS.dark,
                    font: regularFont
                })

                currentY -= rowHeight
            }

            currentY -= 20

            // Draw totals box
            const totalsBoxWidth = 250
            const totalsBoxHeight = 100
            const totalsBoxX = PAGE_WIDTH - MARGIN_SIDE - totalsBoxWidth

            drawRect(page, totalsBoxX, currentY - totalsBoxHeight, totalsBoxWidth, totalsBoxHeight, {
                color: COLORS.lightGray,
                borderColor: COLORS.green,
                borderWidth: 1
            })

            // Totals content
            drawText(page, 'Subtotal:', {
                x: totalsBoxX + 10,
                y: currentY - 25,
                size: 10,
                font: regularFont
            })
            drawText(page, formatCurrency(subtotal), {
                x: totalsBoxX + totalsBoxWidth - 10,
                y: currentY - 25,
                size: 10,
                font: regularFont
            })

            drawText(page, 'Moms:', {
                x: totalsBoxX + 10,
                y: currentY - 45,
                size: 10,
                font: regularFont
            })
            drawText(page, formatCurrency(taxAmount), {
                x: totalsBoxX + totalsBoxWidth - 10,
                y: currentY - 45,
                size: 10,
                font: regularFont
            })

            // Total line
            drawLine(page, totalsBoxX + 10, currentY - 60, totalsBoxX + totalsBoxWidth - 10, currentY - 60, COLORS.green, 1)

            drawText(page, 'TOTAL:', {
                x: totalsBoxX + 10,
                y: currentY - 80,
                size: 12,
                font: boldFont
            })
            drawText(page, formatCurrency(totalAmount), {
                x: totalsBoxX + totalsBoxWidth - 10,
                y: currentY - 80,
                size: 12,
                font: boldFont
            })

            currentY -= totalsBoxHeight + 30

            // Payment section
            drawText(page, `Betalingsbetingelser: ${invoice.payment_terms || 'Netto 30 dage'}`, {
                x: MARGIN_SIDE,
                y: currentY,
                size: 10,
                font: regularFont
            })
            currentY -= 20

            drawText(page, `Noter: ${invoice.notes || 'Tak for din forretning!'}`, {
                x: MARGIN_SIDE,
                y: currentY,
                size: 10,
                font: regularFont
            })

            // QR code if available
            if (invoice.payment_qr_url) {
                const qrImage = await loadImage(pdfDoc, invoice.payment_qr_url)
                if (qrImage) {
                    const qrSize = 120
                    const qrX = PAGE_WIDTH - MARGIN_SIDE - qrSize
                    const qrY = currentY - qrSize

                    page.drawImage(qrImage, {
                        x: qrX,
                        y: qrY,
                        width: qrSize,
                        height: qrSize
                    })
                }
            }

            // Footer
            currentY = MARGIN_BOTTOM + 20
            drawText(page, `Side 1/1`, {
                x: PAGE_WIDTH - MARGIN_SIDE - 50,
                y: currentY,
                size: 8,
                color: COLORS.dark,
                font: regularFont
            })

            // Generate PDF bytes
            const pdfBytes = await pdfDoc.save()
            pdfContent = new Uint8Array(pdfBytes)

            filename = `invoice-${invoice.invoice_number || invoice.id}.pdf`
        } else {
            return new Response(
                JSON.stringify({ error: 'Unsupported document type. Use "invoice"' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Return the generated document
        return new Response(pdfContent, {
            status: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfContent.length.toString(),
            },
        })

    } catch (error) {
        console.error('Error in pdf-generator-v2 function:', error)
        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : String(error),
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
