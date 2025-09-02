import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import { createPerson, updatePerson, searchPeople } from "./people";
import { Person } from "@/lib/schemas/person";
import type { PersonCreate } from "@/lib/schemas/person";

// Mock the API module
vi.mock("@/lib/api", () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    },
}));

const mockApi = vi.mocked(api);

describe("People Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createPerson", () => {
        it("should create person successfully", async () => {
            const mockPerson: Person = {
                id: "1",
                companyId: "company1",
                firstName: "John",
                lastName: "Doe",
                email: "john.doe@example.com",
                phone: "+1234567890",
                title: "Developer",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const createData = {
                companyId: "company1",
                firstName: "John",
                lastName: "Doe",
                email: "john.doe@example.com",
                phone: "+1234567890",
                title: "Developer",
            };

            mockApi.post.mockResolvedValueOnce({
                data: mockPerson,
                status: 200,
                statusText: "OK",
                headers: {},
                config: {} as any
            });

            const result = await createPerson(createData);

            expect(mockApi.post).toHaveBeenCalledWith("/people", createData);
            expect(result).toEqual(mockPerson);
        });

        it("should handle API errors gracefully", async () => {
            const error = new Error("API Error");
            mockApi.post.mockRejectedValueOnce(error);

            const createData = {
                companyId: "company1",
                firstName: "John",
                lastName: "Doe"
            };

            await expect(createPerson(createData)).rejects.toThrow("API Error");
        });
    });

    describe("updatePerson", () => {
        it("should update person successfully", async () => {
            const mockPerson: Person = {
                id: "1",
                companyId: "company1",
                firstName: "Jane",
                lastName: "Smith",
                email: "jane.smith@example.com",
                phone: "+0987654321",
                title: "Manager",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const updateData = {
                firstName: "Jane",
                lastName: "Smith",
                title: "Manager",
            };

            mockApi.put.mockResolvedValueOnce({
                data: mockPerson,
                status: 200,
                statusText: "OK",
                headers: {},
                config: {} as any
            });

            const result = await updatePerson("1", updateData);

            expect(mockApi.put).toHaveBeenCalledWith("/people/1", updateData);
            expect(result).toEqual(mockPerson);
        });
    });

    describe("searchPeople", () => {
        it("should search people successfully", async () => {
            const mockPeople = [
                { id: "1", firstName: "John", lastName: "Doe" },
                { id: "2", firstName: "Jane", lastName: "Smith" },
            ];

            mockApi.get.mockResolvedValueOnce({
                data: mockPeople,
                status: 200,
                statusText: "OK",
                headers: {},
                config: {} as any
            });

            const result = await searchPeople("test", "company1");

            expect(mockApi.get).toHaveBeenCalledWith("/people", {
                params: { q: "test", companyId: "company1", limit: 20 }
            });
            expect(result).toEqual(mockPeople);
        });
    });

    describe("API parsing", () => {
        it("should parse valid person data with zod", async () => {
            const validPersonData = {
                id: "1",
                companyId: "company1",
                firstName: "Valid",
                lastName: "Person",
                email: "valid@example.com",
                phone: "+1234567890",
                title: "Developer",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            mockApi.post.mockResolvedValueOnce({
                data: validPersonData,
                status: 200,
                statusText: "OK",
                headers: {},
                config: {} as any
            });

            const result = await createPerson({
                companyId: "company1",
                firstName: "Valid",
                lastName: "Person"
            });

            // The data should be parsed and validated by zod
            expect(result).toMatchObject({
                id: "1",
                firstName: "Valid",
                lastName: "Person",
                companyId: "company1",
            });
        });

        it("should reject invalid person data", async () => {
            const invalidPersonData = {
                id: "1",
                // Missing required fields
                email: "invalid@example.com",
            };

            mockApi.post.mockResolvedValueOnce({
                data: invalidPersonData,
                status: 200,
                statusText: "OK",
                headers: {},
                config: {} as any
            });

            // This should fail zod validation
            await expect(createPerson({
                companyId: "company1",
                firstName: "Valid",
                lastName: "Name"
            })).rejects.toThrow();
        });
    });
});
