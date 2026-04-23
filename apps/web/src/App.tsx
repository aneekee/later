import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';

import { Toaster } from '@/shared/components/ui/sonner';

import { AppLayout } from './widgets/AppLayout';

import { WithAuth } from './features/auth/components/WithAuth';

const HomePage = lazy(() =>
  import('./features/home/pages/Home.page').then((m) => ({
    default: m.HomePage,
  })),
);
const NotesPage = lazy(() =>
  import('./features/notes/pages/Notes.page').then((m) => ({
    default: m.NotesPage,
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
            <Route path="/" element={<HomePage />} />
            <Route path="/notes" element={<NotesPage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
};
