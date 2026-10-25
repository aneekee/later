import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { Toaster } from '@/shared/components/ui/sonner';

import { AppLayout } from './widgets/AppLayout';

import { WithAuth } from './features/auth/components/WithAuth';

const DashboardPage = lazy(() =>
  import('./features/dashboard/pages/Dashboard.page').then((m) => ({
    default: m.DashboardPage,
  })),
);
const FeedPage = lazy(() =>
  import('./features/feed/pages/Feed.page').then((m) => ({
    default: m.FeedPage,
  })),
);
const LoginPage = lazy(() =>
  import('./features/auth/pages/Login.page').then((m) => ({
    default: m.LoginPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('./features/auth/pages/NotFound.page').then((m) => ({
    default: m.NotFoundPage,
  })),
);

export const App = () => {
  return (
    <>
      <Toaster />
      <Suspense fallback={null}>
        <Routes>
          <Route
            element={
              <WithAuth>
                <AppLayout />
              </WithAuth>
            }
          >
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
};
