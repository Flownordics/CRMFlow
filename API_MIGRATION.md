# API Migration Guide: From Mocks to Real Backend

This document explains how to switch CRMFlow from using mock data to a real backend API with comprehensive features.

## 🚀 Quick Start

### 1. Environment Configuration

Create a `.env` file in your project root with:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8080/api
VITE_USE_MOCKS=false

# Debug Configuration (optional)
VITE_DEBUG_UI=true
```

### 2. Backend Requirements

Your backend should implement these endpoints:

#### Health Check
- `GET /api/health` → `{ "ok": true }`

#### Companies
- `GET /api/companies?page=1&limit=20&q=&industry=&country=` → `{ "data": [...], "total": 100, "page": 1, "limit": 20, "totalPages": 5, "success": true }`
- `GET /api/companies/:id` → `{ "data": {...}, "success": true }`
- `POST /api/companies` → `{ "data": {...}, "success": true }`
- `PUT /api/companies/:id` → `{ "data": {...}, "success": true }`

#### People
- `GET /api/people?page=1&limit=20&q=&companyId=&title=` → `{ "data": [...], "total": 50, "page": 1, "limit": 20, "totalPages": 3, "success": true }`
- `GET /api/people/:id` → `{ "data": {...}, "success": true }`
- `POST /api/people` → `{ "data": {...}, "success": true }`
- `PUT /api/people/:id` → `{ "data": {...}, "success": true }`

#### Deals
- `GET /api/deals?page=1&limit=20&q=&stageId=&companyId=` → `{ "data": [...], "total": 25, "page": 1, "limit": 20, "totalPages": 2, "success": true }`
- `GET /api/deals/:id` → `{ "data": {...}, "success": true }`
- `POST /api/deals` → `{ "data": {...}, "success": true }`
- `PUT /api/deals/:id` → `{ "data": {...}, "success": true }`
- `POST /api/deals/:id/move` → `{ "data": {...}, "success": true }`

#### File Uploads
- `POST /api/uploads/presign` → `{ "url": "...", "fields": {...} }` (S3 presigned POST) or `{ "url": "..." }` (direct PUT)
- `POST /api/documents` → `{ "data": {...}, "success": true }`
- `GET /api/documents?entityType=&entityId=` → `{ "data": [...], "success": true }`
- `DELETE /api/documents/:id` → `{ "success": true }`

#### PDF Generation
- `GET /api/pdf/:type/:id` → `application/pdf` blob response

#### Conversions
- `POST /api/deals/:id/convert/quote` → `{ "id": "...", "dealId": "...", "success": true }`
- `POST /api/deals/:id/convert/order` → `{ "id": "...", "dealId": "...", "success": true }`
- `POST /api/deals/:id/convert/invoice` → `{ "id": "...", "dealId": "...", "success": true }`

#### Activity Logging
- `POST /api/activity` → `{ "data": {...}, "success": true }`
- `GET /api/activity?dealId=` → `{ "data": [...], "success": true }`

## ⚙️ Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8080/api` | ✅ Yes |
| `VITE_USE_MOCKS` | Force mock mode | `false` | ❌ No |
| `VITE_DEBUG_UI` | Show debug indicators | `false` | ❌ No |

### Fallback Logic

The app automatically falls back to mocks when:
1. `VITE_USE_MOCKS=true` is set
2. `VITE_API_BASE_URL` is not provided
3. Backend health check fails
4. **Production builds require VITE_API_BASE_URL** (build will fail if missing)

## 🆕 New Features

### 1. Server-Driven Pagination & Filtering
- **Companies**: Page, limit, search, industry, country filters
- **People**: Page, limit, search, company, title filters  
- **Deals**: Page, limit, search, stage, company filters
- All filters support both `{ data: [], total: number }` and direct array responses

### 2. File Upload with Presign
- **Presign Flow**: `POST /uploads/presign` → Upload to URL → `POST /documents`
- **S3 Support**: Handles both presigned POST (with fields) and direct PUT
- **Entity Linking**: Automatically links uploads to deals, companies, or people
- **Progress Feedback**: Loading states and success/error toasts

### 3. Live PDF Generation
- **Blob Handling**: `GET /pdf/:type/:id` with `responseType: "blob"`
- **Memory Management**: Automatic `URL.revokeObjectURL()` cleanup
- **Fallback Download**: Falls back to download if window.open fails
- **Toast Notifications**: Success/error feedback for users

### 4. Deal Conversions with Idempotency
- **Idempotency Keys**: Unique keys prevent double-creation on double-clicks
- **Activity Logging**: Automatic logging of document creation events
- **Error Handling**: Graceful fallback with console logging
- **Query Invalidation**: Automatic cache refresh after conversions

### 5. Enhanced Error Handling
- **Schema Validation**: Zod parsing with clear error messages
- **Toast Notifications**: User-friendly error feedback
- **Graceful Degradation**: Fallback to mocks when backend unavailable
- **Console Logging**: Detailed error information for developers

## 🧪 Testing

### E2E Smoke Tests

#### Companies Live Test (`tests/e2e/companies-live.spec.ts`)
- ✅ Create company → appears in table
- ✅ Search "Acme" → finds results
- ✅ Pagination → switches pages correctly
- ✅ Industry/country filters → apply correctly
- ✅ Edit company → persists changes

#### People Live Test (`tests/e2e/people-live.spec.ts`)
- ✅ Filter by company → shows subset
- ✅ Search "@" → finds email results
- ✅ Edit person → persists after refresh
- ✅ Title filters → apply correctly
- ✅ Company links → navigate correctly

#### Deals Live Test (`tests/e2e/deals-live.spec.ts`)
- ✅ Search by title → finds results
- ✅ Move between stages → persists after reload
- ✅ Create deal → appears in list
- ✅ Stage filters → apply correctly
- ✅ Company information → displays correctly

### Manual Testing Checklist

1. **Environment Setup**
   - [ ] `VITE_API_BASE_URL` points to backend
   - [ ] `VITE_USE_MOCKS=false`
   - [ ] `VITE_DEBUG_UI=true` (optional)

2. **Health Check**
   - [ ] Header shows "API: Live" badge
   - [ ] No "API Unreachable" toasts
   - [ ] Console shows configuration log

3. **Companies Page**
   - [ ] Search "Acme" works
   - [ ] Paginate to page 2
   - [ ] Industry/country filters work
   - [ ] Create/edit companies work (200 responses)

4. **People Page**
   - [ ] Filter by company works
   - [ ] Search "@" finds emails
   - [ ] Edit person persists
   - [ ] Title filters work

5. **Deals Page**
   - [ ] Search by title works
   - [ ] Move between stages persists
   - [ ] Stage filters work
   - [ ] Company links navigate

6. **File Uploads**
   - [ ] Upload file → appears in Documents
   - [ ] Success toast shows
   - [ ] Error handling works (role="alert")

7. **PDF Generation**
   - [ ] Quote/Order/Invoice PDF opens in new tab
   - [ ] `application/pdf` content type
   - [ ] Blob URLs clean up properly

8. **Conversions**
   - [ ] Double-click creates only 1 document
   - [ ] Activity timeline shows "Created quote/order/invoice"
   - [ ] Success toasts display

9. **Error Handling**
   - [ ] 401 redirects to login with toast
   - [ ] Schema mismatches show clear errors
   - [ ] Network errors fallback gracefully

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend allows requests from your frontend origin
   - Check `Access-Control-Allow-Origin` headers
   - Verify preflight OPTIONS requests are handled

2. **401 Unauthorized**
   - Verify auth tokens are being sent correctly
   - Check backend auth middleware
   - Ensure token cleanup works on logout

3. **Schema Mismatches**
   - Ensure backend response format matches expected schemas
   - Check for null vs undefined differences
   - Verify required fields are present

4. **Health Check Fails**
   - Verify `/api/health` endpoint exists and returns `{ "ok": true }`
   - Check network connectivity and firewall settings
   - Ensure backend is running and accessible

5. **File Upload Issues**
   - Check presign endpoint returns correct URL format
   - Verify S3/MinIO configuration for presigned URLs
   - Ensure CORS allows PUT/POST to upload URLs

6. **PDF Generation Fails**
   - Verify `/pdf/:type/:id` endpoint returns `application/pdf`
   - Check blob handling in browser
   - Ensure proper cleanup of blob URLs

### Debug Mode

Enable debug mode to see:
- Current API configuration
- Health check results
- API mode indicator in header
- Detailed console logging

```bash
VITE_DEBUG_UI=true
```

## 🚨 Production Deployment

### CI/CD Requirements

**Build Script Protection**:
```bash
# This will fail if VITE_API_BASE_URL is not set
export VITE_USE_MOCKS=false
npm run build
```

**Required Environment Variables**:
- `VITE_API_BASE_URL` - Must be set in production
- `VITE_USE_MOCKS=false` - Enforced in production builds

### Production Checklist

- [ ] `VITE_API_BASE_URL` is set to production backend
- [ ] `VITE_USE_MOCKS=false` is enforced
- [ ] Backend health check passes
- [ ] All CRUD operations work with live API
- [ ] File uploads work with production storage
- [ ] PDF generation works with production backend
- [ ] Error handling works gracefully
- [ ] Performance is acceptable with real data

## 🔄 Rollback

To quickly switch back to mocks:

```bash
VITE_USE_MOCKS=true
```

Or restart the dev server without the environment variable set.

**Note**: Production builds cannot use mocks - they require a valid `VITE_API_BASE_URL`.

## 📚 API Response Formats

### Paginated Responses
```typescript
{
  data: T[],
  total: number,
  page: number,
  limit: number,
  totalPages: number,
  success: boolean
}
```

### Error Responses
```typescript
{
  error: string,
  message: string,
  statusCode: number
}
```

### Success Responses
```typescript
{
  data: T,
  success: boolean
}
```

## 🎯 Next Steps

1. **Implement Backend Endpoints**: Follow the API specifications above
2. **Test with Live Data**: Use the E2E tests to verify functionality
3. **Monitor Performance**: Ensure pagination and filtering are performant
4. **Add Error Monitoring**: Implement proper error tracking and alerting
5. **Security Review**: Ensure proper authentication and authorization
6. **Load Testing**: Verify backend can handle expected traffic
7. **Documentation**: Update API documentation for your team

## 🆘 Support

If you encounter issues:

1. Check the browser console for detailed error messages
2. Verify backend endpoints are working with tools like Postman
3. Check network tab for failed requests
4. Ensure environment variables are set correctly
5. Verify backend CORS and authentication configuration

The application is designed to fail gracefully and provide clear error messages to help with debugging.
