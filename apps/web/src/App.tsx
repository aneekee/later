import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';

import { Toaster } from '@/shared/components/ui/sonner';

import { WithAuth } from './features/auth/components/WithAuth';

const HomePage = lazy(() =>
  import('./features/home/pages/Home.page').then((m) => ({
    default: m.HomePage,
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
            path="/"
            element={
              <WithAuth>
                <HomePage />
              </WithAuth>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
};
