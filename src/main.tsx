
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Auth from './pages/Auth';
import Index from './pages/Index';
import Billing from './pages/Billing';
import BillingModels from './pages/BillingModels';
import SavedModels from './pages/SavedModels';
import Products from './pages/Products';
import Pricing from './pages/Pricing';
import StripePricing from './pages/StripePricing';
import Settings from './pages/Settings';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import NotFound from './pages/NotFound';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/auth',
    element: <Auth />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Index />
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing',
    element: (
      <ProtectedRoute>
        <Billing />
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing-models',
    element: (
      <ProtectedRoute>
        <BillingModels />
      </ProtectedRoute>
    ),
  },
  {
    path: '/saved-models',
    element: (
      <ProtectedRoute>
        <SavedModels />
      </ProtectedRoute>
    ),
  },
  {
    path: '/products',
    element: (
      <ProtectedRoute>
        <Products />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pricing',
    element: (
      <ProtectedRoute>
        <Pricing />
      </ProtectedRoute>
    ),
  },
  {
    path: '/stripe-pricing',
    element: (
      <ProtectedRoute>
        <StripePricing />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  {
    path: '/payment-success',
    element: (
      <ProtectedRoute>
        <PaymentSuccess />
      </ProtectedRoute>
    ),
  },
  {
    path: '/payment-cancel',
    element: (
      <ProtectedRoute>
        <PaymentCancel />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
