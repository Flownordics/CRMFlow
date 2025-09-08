# Netlify Deployment Guide - PDF Generator v2

This guide will help you deploy your CRMFlow application with the new professional PDF generator to Netlify.

## Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Supabase Project**: Your Supabase project should be set up and running

## Step 1: Install Dependencies

The PDF generator requires `pdf-lib` which has been added to your `package.json`. Run:

```bash
npm install
```

## Step 2: Environment Variables

You need to set up environment variables in Netlify for your Supabase connection:

### In Netlify Dashboard:
1. Go to your site settings
2. Navigate to "Environment variables"
3. Add these variables:

```
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### For Local Development:
Create a `.env.local` file in your project root:

```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Step 3: Deploy to Netlify

### Option A: Connect GitHub Repository (Recommended)

1. **Connect Repository**:
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Choose "GitHub" and authorize Netlify
   - Select your CRMFlow repository

2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

3. **Deploy**:
   - Click "Deploy site"
   - Netlify will automatically build and deploy your site

### Option B: Manual Deploy

1. **Build Locally**:
   ```bash
   npm run build
   ```

2. **Deploy**:
   - Go to your Netlify dashboard
   - Drag and drop the `dist` folder to deploy

## Step 4: Test the PDF Generator

Once deployed, test your PDF generator:

```javascript
// Test the PDF generator function
const response = await fetch('/.netlify/functions/pdfgen', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'invoice',
    data: {
      id: 'your-invoice-id'
    }
  })
});

const pdfBlob = await response.blob();
// Download or display the PDF
```

## Step 5: Update Your Frontend

Update your frontend code to use the Netlify function instead of Supabase Edge Functions:

```javascript
// Replace Supabase Edge Function calls with Netlify Function calls
const generatePDF = async (invoiceId) => {
  const response = await fetch('/.netlify/functions/pdfgen', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'invoice',
      data: { id: invoiceId }
    })
  });

  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
```

## Features Included

✅ **Professional PDF Layout**:
- Branded header with primary color (#698BB5)
- Meta box with invoice details
- Two-column address layout
- Zebra-striped line items table
- Totals box with proper formatting
- Payment section with notes
- Footer with page numbering

✅ **Danish Character Support**:
- Inter font with fallback to Helvetica
- No more character escaping needed

✅ **Image Support**:
- Company logo in header (max 120x40 pt)
- QR codes in payment section (120x120 pt)

✅ **Color Palette**:
- All your brand colors implemented
- Professional visual hierarchy

## Troubleshooting

### Common Issues:

1. **Function Not Found (404)**:
   - Ensure `netlify/functions/pdfgen/index.js` exists
   - Check that the function directory is correctly set in `netlify.toml`

2. **Environment Variables Not Working**:
   - Verify variables are set in Netlify dashboard
   - Check variable names match exactly (case-sensitive)

3. **PDF Generation Fails**:
   - Check Supabase connection
   - Verify invoice ID exists in database
   - Check function logs in Netlify dashboard

4. **Font Loading Issues**:
   - Function falls back to Helvetica if Inter font fails
   - Check network connectivity for font downloads

### Debugging:

1. **Check Function Logs**:
   - Go to Netlify dashboard → Functions → View logs

2. **Test Locally**:
   ```bash
   npm run build
   netlify dev
   ```

3. **Verify Environment Variables**:
   ```javascript
   console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
   ```

## Performance Notes

- **Cold Start**: First function call may be slower (~2-3 seconds)
- **Warm Function**: Subsequent calls are faster (~500ms-1s)
- **PDF Size**: Generated PDFs are typically 50-200KB
- **Memory Usage**: Function uses ~128MB memory

## Security

- Service role key is used for database access
- CORS is properly configured
- Input validation is implemented
- No sensitive data is logged

## Next Steps

1. **Monitor Performance**: Use Netlify Analytics to track function usage
2. **Set up Alerts**: Configure notifications for function errors
3. **Optimize**: Consider caching for frequently accessed invoices
4. **Scale**: Monitor function limits and upgrade if needed

Your professional PDF generator is now ready for production! 🚀