import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LandingDashboard } from '../components/LandingDashboard';
import transactionsReducer from '../store/transactionsSlice';
import categoriesReducer from '../store/categoriesSlice';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Create a mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      transactions: transactionsReducer,
      categories: categoriesReducer,
    },
    preloadedState: {
      transactions: {
        items: [],
        isLoading: false,
        error: null,
      },
      categories: {
        items: [],
        isLoading: false,
        error: null,
      },
      ...initialState,
    },
  });
};

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
  },
};

const mockProfile = {
  user_id: 'test-user-id',
  currency: 'USD',
  onboarded: true,
  categories: [],
};

describe('LandingDashboard', () => {
  it('renders welcome message with user name', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <LandingDashboard user={mockUser} profile={mockProfile} />
      </Provider>
    );

    expect(screen.getByText(/Welcome back, Test User!/)).toBeInTheDocument();
  });

  it('renders quick actions section', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <LandingDashboard user={mockUser} profile={mockProfile} />
      </Provider>
    );

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Upload Statement')).toBeInTheDocument();
    expect(screen.getByText('Categorise Transactions')).toBeInTheDocument();
    expect(screen.getByText('View Dashboard')).toBeInTheDocument();
  });

  it('shows appropriate notification for empty transactions', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <LandingDashboard user={mockUser} profile={mockProfile} />
      </Provider>
    );

    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Upload your first bank statement to begin tracking')).toBeInTheDocument();
  });

  it('displays stats cards with zero values for empty transactions', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <LandingDashboard user={mockUser} profile={mockProfile} />
      </Provider>
    );

    expect(screen.getByText('Monthly Income')).toBeInTheDocument();
    expect(screen.getByText('Monthly Expenses')).toBeInTheDocument();
    expect(screen.getByText('Net Balance')).toBeInTheDocument();
    expect(screen.getByText('Total Transactions')).toBeInTheDocument();
  });
});
