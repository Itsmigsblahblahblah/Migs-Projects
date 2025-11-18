import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AdminMessages from '@/components/dashboard/farmer/AdminMessages';

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  db: {
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    onSnapshot: vi.fn(() => vi.fn()), // Return unsubscribe function
  },
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('AdminMessages', () => {
  it('renders correctly with no messages', () => {
    render(<AdminMessages userId="test-user-id" />);
    
    expect(screen.getByText('Messages from Admin')).toBeInTheDocument();
    expect(screen.getByText('No messages from admin yet.')).toBeInTheDocument();
  });
});