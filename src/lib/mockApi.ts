import { Company } from "@/lib/schemas/company";
import { Person } from "@/lib/schemas/person";

// Mock data for development - updated to match current schemas
const mockCompanies: Company[] = [
    {
        id: "1",
        name: "Acme Corporation",
        email: "info@acme.com",
        phone: "+1-555-0123",
        address: "123 Business St",
        city: "New York",
        country: "USA",
        industry: "Technology",
        website: "https://acme.com",
        domain: "acme.com",
        vat: "US123456789",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
    },
    {
        id: "2",
        name: "TechStart Inc",
        email: "hello@techstart.com",
        phone: "+1-555-0456",
        address: "456 Innovation Ave",
        city: "San Francisco",
        country: "USA",
        industry: "Software",
        website: "https://techstart.com",
        domain: "techstart.com",
        vat: "US987654321",
        createdAt: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
    },
    {
        id: "3",
        name: "Global Solutions Ltd",
        email: "contact@globalsolutions.com",
        phone: "+44-20-7946-0958",
        address: "789 Enterprise Rd",
        city: "London",
        country: "UK",
        industry: "Consulting",
        website: "https://globalsolutions.com",
        domain: "globalsolutions.com",
        vat: "GB123456789",
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
    },
];

const mockPeople: Person[] = [
    {
        id: "1",
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@acme.com",
        phone: "+1-555-0001",
        title: "CEO",
        companyId: "1",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
    },
    {
        id: "2",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@techstart.com",
        phone: "+1-555-0002",
        title: "CTO",
        companyId: "2",
        createdAt: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
    },
    {
        id: "3",
        firstName: "Michael",
        lastName: "Brown",
        email: "michael.brown@globalsolutions.com",
        phone: "+44-20-7946-0003",
        title: "Managing Director",
        companyId: "3",
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
    },
    {
        id: "4",
        firstName: "Emily",
        lastName: "Davis",
        email: "emily.davis@acme.com",
        phone: "+1-555-0004",
        title: "VP of Sales",
        companyId: "1",
        createdAt: "2024-01-04T00:00:00.000Z",
        updatedAt: "2024-01-04T00:00:00.000Z",
    },
];

// Mock API functions
export const mockApi = {
    get: async (url: string, config?: any) => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));

        if (url === "/companies") {
            return { data: mockCompanies };
        }

        if (url === "/people") {
            return { data: mockPeople };
        }

        if (url.startsWith("/companies/")) {
            const id = url.split("/")[2];
            const company = mockCompanies.find(c => c.id === id);
            if (!company) throw new Error("Company not found");
            return { data: company };
        }

        if (url.startsWith("/people/")) {
            const id = url.split("/")[2];
            const person = mockPeople.find(p => p.id === id);
            if (!person) throw new Error("Person not found");
            return { data: person };
        }

        throw new Error(`Mock API: Endpoint ${url} not implemented`);
    },

    post: async (url: string, data: any) => {
        await new Promise(resolve => setTimeout(resolve, 100));

        if (url === "/companies") {
            const newCompany: Company = {
                ...data,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            mockCompanies.push(newCompany);
            return { data: newCompany };
        }

        if (url === "/people") {
            const newPerson: Person = {
                ...data,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            mockPeople.push(newPerson);
            return { data: newPerson };
        }

        throw new Error(`Mock API: Endpoint ${url} not implemented`);
    },

    put: async (url: string, data: any) => {
        await new Promise(resolve => setTimeout(resolve, 100));

        if (url.startsWith("/companies/")) {
            const id = url.split("/")[2];
            const index = mockCompanies.findIndex(c => c.id === id);
            if (index === -1) throw new Error("Company not found");

            const updatedCompany = { ...mockCompanies[index], ...data, updatedAt: new Date().toISOString() };
            mockCompanies[index] = updatedCompany;
            return { data: updatedCompany };
        }

        if (url.startsWith("/people/")) {
            const id = url.split("/")[2];
            const index = mockPeople.findIndex(p => p.id === id);
            if (index === -1) throw new Error("Person not found");

            const updatedPerson = { ...mockPeople[index], ...data, updatedAt: new Date().toISOString() };
            mockPeople[index] = updatedPerson;
            return { data: updatedPerson };
        }

        throw new Error(`Mock API: Endpoint ${url} not implemented`);
    },

    delete: async (url: string) => {
        await new Promise(resolve => setTimeout(resolve, 100));

        if (url.startsWith("/companies/")) {
            const id = url.split("/")[2];
            const index = mockCompanies.findIndex(c => c.id === id);
            if (index === -1) throw new Error("Company not found");
            mockCompanies.splice(index, 1);
            return { data: { success: true } };
        }

        if (url.startsWith("/people/")) {
            const id = url.split("/")[2];
            const index = mockPeople.findIndex(p => p.id === id);
            if (index === -1) throw new Error("Person not found");
            mockPeople.splice(index, 1);
            return { data: { success: true } };
        }

        throw new Error(`Mock API: Endpoint ${url} not implemented`);
    },
};
