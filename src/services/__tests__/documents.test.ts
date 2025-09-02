import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listDocuments, uploadDocument, getDownloadUrl, deleteDocument, updateDocumentRelations } from '../documents';

// Mock the API client
vi.mock('@/lib/api', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
        patch: vi.fn(),
    },
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
        patch: vi.fn(),
    },
}));

// Mock USE_MOCKS
vi.mock('@/lib/debug', () => ({
    USE_MOCKS: true,
}));

describe('Documents Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('listDocuments', () => {
        it('should return mock documents with filters', async () => {
            const params = {
                limit: 10,
                offset: 0,
                q: 'test',
                companyId: 'company-1',
            };

            const result = await listDocuments(params);

            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('id');
            expect(result[0]).toHaveProperty('file_name');
            expect(result[0]).toHaveProperty('mime_type');
            expect(result[0]).toHaveProperty('size_bytes');
        });
    });

    describe('uploadDocument', () => {
        it('should upload a document with metadata', async () => {
            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
            const meta = {
                companyId: '550e8400-e29b-41d4-a716-446655440003',
                dealId: '550e8400-e29b-41d4-a716-446655440004',
                personId: undefined,
            };

            const result = await uploadDocument(file, meta);

            expect(result).toHaveProperty('id');
            expect(result.file_name).toBe('test.pdf');
            expect(result.mime_type).toBe('application/pdf');
            expect(result.company_id).toBe('550e8400-e29b-41d4-a716-446655440003');
            expect(result.deal_id).toBe('550e8400-e29b-41d4-a716-446655440004');
        });
    });

    describe('getDownloadUrl', () => {
        it('should return download URL for document', async () => {
            const documentId = '550e8400-e29b-41d4-a716-446655440001';

            const result = await getDownloadUrl(documentId);

            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('filename');
            expect(result.url).toContain('mock-s3.example.com');
        });
    });

    describe('deleteDocument', () => {
        it('should delete a document', async () => {
            const documentId = '550e8400-e29b-41d4-a716-446655440001';

            const result = await deleteDocument(documentId);

            expect(result).toBe(true);
        });
    });

    describe('updateDocumentRelations', () => {
        it('should update document relations', async () => {
            const documentId = '550e8400-e29b-41d4-a716-446655440001';
            const relations = {
                companyId: '550e8400-e29b-41d4-a716-446655440008',
                dealId: null,
                personId: '550e8400-e29b-41d4-a716-446655440006',
            };

            const result = await updateDocumentRelations(documentId, relations);

            expect(result).toHaveProperty('id', documentId);
            expect(result.company_id).toBe('550e8400-e29b-41d4-a716-446655440008');
            expect(result.deal_id).toBeNull();
            expect(result.person_id).toBe('550e8400-e29b-41d4-a716-446655440006');
        });
    });
});
