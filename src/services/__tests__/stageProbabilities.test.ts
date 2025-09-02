import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listStages, listStageProbabilities, upsertStageProbability } from '../stageProbabilities';
import { api } from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

describe('Stage Probabilities Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('listStages', () => {
        it('should fetch stages successfully', async () => {
            const mockStages = [
                {
                    id: '1',
                    name: 'Lead',
                    position: 1,
                    pipeline_id: 'pipeline-1',
                },
                {
                    id: '2',
                    name: 'Qualified',
                    position: 2,
                    pipeline_id: 'pipeline-1',
                },
            ];

            vi.mocked(api.get).mockResolvedValue({
                data: mockStages,
            });

            const result = await listStages();

            expect(api.get).toHaveBeenCalledWith('/stages?select=id,name,position,pipeline_id&order=position', {
                headers: {
                    'Prefer': 'return=representation',
                    'count': 'exact',
                },
            });
            expect(result).toEqual(mockStages);
        });

        it('should fetch stages for specific pipeline', async () => {
            const mockStages = [
                {
                    id: '1',
                    name: 'Lead',
                    position: 1,
                    pipeline_id: 'pipeline-1',
                },
            ];

            vi.mocked(api.get).mockResolvedValue({
                data: mockStages,
            });

            const result = await listStages('pipeline-1');

            expect(api.get).toHaveBeenCalledWith('/stages?select=id,name,position,pipeline_id&order=position&pipeline_id=eq.pipeline-1', {
                headers: {
                    'Prefer': 'return=representation',
                    'count': 'exact',
                },
            });
            expect(result).toEqual(mockStages);
        });

        it('should return empty array when no stages found', async () => {
            vi.mocked(api.get).mockResolvedValue({
                data: [],
            });

            const result = await listStages();

            expect(result).toEqual([]);
        });
    });

    describe('listStageProbabilities', () => {
        it('should fetch stage probabilities successfully', async () => {
            const mockProbabilities = [
                {
                    stage_id: '1',
                    probability: 0.1,
                    stages: {
                        id: '1',
                        name: 'Lead',
                        position: 1,
                        pipeline_id: 'pipeline-1',
                    },
                },
                {
                    stage_id: '2',
                    probability: 0.5,
                    stages: {
                        id: '2',
                        name: 'Qualified',
                        position: 2,
                        pipeline_id: 'pipeline-1',
                    },
                },
            ];

            vi.mocked(api.get).mockResolvedValue({
                data: mockProbabilities,
            });

            const result = await listStageProbabilities();

            expect(api.get).toHaveBeenCalledWith('/stage_probabilities?select=stage_id,probability,stages(id,name,position,pipeline_id)&stages.order=position.asc', {
                headers: {
                    'Prefer': 'return=representation',
                    'count': 'exact',
                },
            });
            expect(result).toEqual(mockProbabilities);
        });

        it('should return empty array when no probabilities found', async () => {
            vi.mocked(api.get).mockResolvedValue({
                data: [],
            });

            const result = await listStageProbabilities();

            expect(result).toEqual([]);
        });
    });

    describe('upsertStageProbability', () => {
        it('should upsert stage probability successfully', async () => {
            const mockProbability = {
                stage_id: '1',
                probability: 0.3,
            };

            vi.mocked(api.post).mockResolvedValue({
                data: [mockProbability],
            });

            const result = await upsertStageProbability({ stageId: '1', probability: 0.3 });

            expect(api.post).toHaveBeenCalledWith('/stage_probabilities', {
                stage_id: '1',
                probability: 0.3,
                updated_at: expect.any(String),
            }, {
                headers: {
                    'Prefer': 'resolution=merge-duplicates,return=representation',
                    'count': 'exact',
                },
            });
            expect(result).toEqual(mockProbability);
        });

        it('should handle single object response', async () => {
            const mockProbability = {
                stage_id: '1',
                probability: 0.3,
            };

            vi.mocked(api.post).mockResolvedValue({
                data: mockProbability,
            });

            const result = await upsertStageProbability({ stageId: '1', probability: 0.3 });

            expect(result).toEqual(mockProbability);
        });
    });
});
