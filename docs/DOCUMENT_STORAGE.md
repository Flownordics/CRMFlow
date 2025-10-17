# Document Storage Implementation

## Overview

CRMFlow uses Supabase Storage for secure document uploads and downloads. Documents can be attached to companies, deals, and people.

## Architecture

### Components

1. **Supabase Storage Bucket**: `documents` bucket stores all uploaded files
2. **Edge Function**: `document-upload` generates presigned upload URLs
3. **Database Table**: `documents` stores metadata about uploaded files
4. **RLS Policies**: Control document access based on authentication

### Flow

```
┌─────────────────────────────────────────────────────┐
│                  Upload Flow                         │
├─────────────────────────────────────────────────────┤
│  1. User selects file in UI                         │
│  2. Frontend calls getPresignedUpload()             │
│  3. Edge Function generates signed URL              │
│  4. Frontend uploads file directly to Storage       │
│  5. Frontend creates document record in DB          │
│  6. Document appears in UI                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                 Download Flow                        │
├─────────────────────────────────────────────────────┤
│  1. User clicks download button                     │
│  2. Frontend calls getDownloadUrl()                 │
│  3. Supabase Storage generates signed URL           │
│  4. Browser downloads file from signed URL          │
└─────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Create Storage Bucket

In Supabase Dashboard:

1. Go to **Storage** → **Buckets**
2. Click **New bucket**
3. Name: `documents`
4. Public bucket: **No** (private)
5. File size limit: **50 MB** (or as needed)
6. Allowed MIME types: Leave empty for all types

### 2. Configure Storage Policies

In Supabase Dashboard → Storage → `documents` → Policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated downloads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid());
```

### 3. Run Database Migration

```bash
# Apply migration to fix documents table schema
psql -d your_database -f database/migrations/20251017000001_document_storage_schema_fix.sql
```

This migration:
- Renames columns to match frontend expectations
- Enables Row Level Security
- Creates RLS policies for document access

### 4. Deploy Edge Function

```bash
# Deploy document-upload function
supabase functions deploy document-upload

# Verify deployment
supabase functions list
```

### 5. Environment Variables

Ensure these are set in your Supabase project:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

## Usage

### Upload Document

```typescript
import { useUploadDocument } from '@/services/documents';

function MyComponent() {
  const uploadDocument = useUploadDocument();

  const handleFileSelect = async (file: File) => {
    await uploadDocument.mutateAsync({
      file,
      meta: {
        companyId: 'company-uuid',
        dealId: 'deal-uuid', // optional
        personId: 'person-uuid', // optional
      }
    });
  };

  return (
    <input 
      type="file" 
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
      }}
    />
  );
}
```

### Download Document

```typescript
import { useDownloadDocument } from '@/services/documents';

function DocumentList({ documents }) {
  const downloadDocument = useDownloadDocument();

  const handleDownload = (documentId: string) => {
    downloadDocument.mutate(documentId);
  };

  return (
    <div>
      {documents.map(doc => (
        <button key={doc.id} onClick={() => handleDownload(doc.id)}>
          Download {doc.file_name}
        </button>
      ))}
    </div>
  );
}
```

### List Documents

```typescript
import { useDocuments } from '@/services/documents';

function CompanyDocuments({ companyId }) {
  const { data: documents, isLoading } = useDocuments({
    companyId,
    limit: 50,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {documents?.map(doc => (
        <div key={doc.id}>
          <p>{doc.file_name}</p>
          <p>{(doc.size_bytes / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      ))}
    </div>
  );
}
```

## Database Schema

```sql
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  mime_type text NOT NULL,
  storage_path text UNIQUE NOT NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
```

## Security

### Row Level Security (RLS)

- **SELECT**: All authenticated users can view documents
- **INSERT**: All authenticated users can upload documents
- **UPDATE**: Users can only update their own documents
- **DELETE**: Users can only delete their own documents

### Storage Policies

- Private bucket (not publicly accessible)
- Signed URLs with 60-second expiration
- User authentication required for all operations

### File Validation

Frontend validates:
- File size (client-side)
- File type (client-side)

Backend validates:
- User authentication
- Storage quota (Supabase)

## Troubleshooting

### Upload Fails with "Storage bucket not configured"

**Solution**: Create the `documents` bucket in Supabase Dashboard

```
Dashboard → Storage → New bucket → Name: "documents"
```

### Upload Fails with "Unauthorized"

**Solution**: Check that user is authenticated and RLS policies are correct

```sql
-- Verify policies exist
SELECT * FROM pg_policies WHERE tablename = 'documents';
```

### Download Returns 404

**Solution**: Verify storage_path exists in Storage bucket

```sql
-- Check document record
SELECT id, file_name, storage_path FROM documents WHERE id = 'your-doc-id';

-- Verify file exists in Storage via Dashboard
```

### "relation does not exist" Error

**Solution**: Run the migration to update schema

```bash
psql -d your_database -f database/migrations/20251017000001_document_storage_schema_fix.sql
```

## Performance Considerations

### Storage Optimization

- Files uploaded directly to Supabase Storage (no backend proxy)
- Signed URLs minimize server load
- Client-side file validation before upload

### Database Indexes

```sql
CREATE INDEX idx_documents_company ON documents (company_id);
CREATE INDEX idx_documents_deal ON documents (deal_id);
CREATE INDEX idx_documents_person ON documents (person_id);
CREATE INDEX idx_documents_created_by ON documents (created_by);
```

### Storage Limits

- Default: 50 MB per file
- Total storage depends on Supabase plan
- Consider adding cleanup job for old files

## Future Enhancements

- [ ] File thumbnails for images
- [ ] Virus scanning integration
- [ ] Duplicate file detection
- [ ] Bulk upload support
- [ ] File versioning
- [ ] Automatic file compression
- [ ] CDN integration for faster downloads

## API Reference

### `getPresignedUpload(params)`

Generates a presigned upload URL.

**Parameters:**
- `fileName: string` - Original filename
- `mimeType: string` - MIME type of the file

**Returns:**
```typescript
{
  url: string,      // Presigned upload URL
  path: string,     // Storage path
  token: string     // Upload token
}
```

### `uploadDocument(file, meta)`

Uploads a file and creates database record.

**Parameters:**
- `file: File` - File object to upload
- `meta: { companyId?, dealId?, personId? }` - Associated entities

**Returns:** `Document` object

### `getDownloadUrl(id)`

Generates a signed download URL.

**Parameters:**
- `id: string` - Document UUID

**Returns:**
```typescript
{
  url: string,      // Signed download URL
  filename: string  // Original filename
}
```

### `deleteDocument(id)`

Deletes document from storage and database.

**Parameters:**
- `id: string` - Document UUID

**Returns:** `boolean` - Success status

## Support

For issues or questions:
1. Check Supabase Storage logs
2. Verify RLS policies are correct
3. Check browser console for errors
4. Review Edge Function logs: `supabase functions logs document-upload`

