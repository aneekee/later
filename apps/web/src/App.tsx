import { Route, Routes } from 'react-router';

import { Toaster } from '@/shared/components/ui/sonner';

import { HomePage } from './features/home/pages/Home.page';
import { LoginPage } from './features/auth/pages/Login.page';
import { NotFoundPage } from './features/auth/pages/NotFound.page';
import { WithAuth } from './features/auth/components/WithAuth';

export const App = () => {
  return (
    <>
      <Toaster />
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
    </>
  );
};
