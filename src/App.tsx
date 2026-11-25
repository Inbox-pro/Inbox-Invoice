import React from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/authStore.ts';
import AppLayout from './components/layout/AppLayout.tsx';
import Landing from './pages/Landing.tsx';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AuthPages.tsx';
import Onboarding from './pages/Onboarding.tsx';
import Dashboard from './pages/Dashboard.tsx';
import InvoicesList from './pages/InvoicesList.tsx';
import InvoiceEditor from './pages/InvoiceEditor.tsx';
import InvoiceDetail from './pages/InvoiceDetail.tsx';
import { CreditNoteCreate, CreditNotesList } from './pages/CreditNotes.tsx';
import { ClientDetail, ClientsList } from './pages/Clients.tsx';
import ProductsList from './pages/ProductsList.tsx';
import Reports from './pages/Reports.tsx';
import Settings from './pages/Settings.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9] p-6">
          <div className="bg-white border border-[#E7E5E4] rounded-xl p-8 max-w-md text-center space-y-3">
            <h1 className="text-lg font-bold text-[#1C1917]">Something went wrong</h1>
            <p className="text-sm text-[#78716C]">
              An unexpected display error occurred. Reload the page to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md bg-[#F26522] text-white text-sm font-medium hover:bg-[#E05A1B] cursor-pointer"
            >
              Reload Inbox E-invoicing
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Onboarding */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            {/* Authenticated Workspace */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/invoices" element={<InvoicesList />} />
              <Route path="/invoices/new" element={<InvoiceEditor />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/invoices/:id/edit" element={<InvoiceEditor />} />
              <Route path="/credit-notes" element={<CreditNotesList />} />
              <Route path="/credit-notes/new" element={<CreditNoteCreate />} />
              <Route path="/clients" element={<ClientsList />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/products" element={<ProductsList />} />
              <Route path="/reports" element={<Reports defaultTab="revenue" />} />
              <Route path="/vat-summary" element={<Reports defaultTab="vat" />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
