import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { PersonOverview } from '../PersonOverview';
import { Person } from '@/lib/schemas/person';

// Mock the i18n hook
vi.mock('@/lib/i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}));

// Mock the toast bus
vi.mock('@/lib/toastBus', () => ({
    toastBus: {
        emit: vi.fn(),
    },
}));

const mockPerson: Person = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    title: 'CEO',
    companyId: 'company-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
};

describe('PersonOverview', () => {
    it('renders person information correctly', () => {
        render(<PersonOverview person={mockPerson} />);

        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
        expect(screen.getByText('+1234567890')).toBeInTheDocument();
        expect(screen.getByText('CEO')).toBeInTheDocument();
    });

    it('renders contact information card', () => {
        render(<PersonOverview person={mockPerson} />);

        expect(screen.getByText('people.contact')).toBeInTheDocument();
    });

    it('renders role information card', () => {
        render(<PersonOverview person={mockPerson} />);

        expect(screen.getByText('people.role')).toBeInTheDocument();
    });

    it('renders meta information card', () => {
        render(<PersonOverview person={mockPerson} />);

        expect(screen.getByText('Meta')).toBeInTheDocument();
    });
});
