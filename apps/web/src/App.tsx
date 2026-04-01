import { Route, Routes } from 'react-router';

import { HomePage } from './features/home/pages/Home.page';
import { LoginPage } from './features/auth/pages/Login.page';
import { NotFoundPage } from './features/auth/pages/NotFound.page';
import { useAuthNavigation } from './features/auth/hooks/useAuthNavigation';

export const App = () => {
  const { isFetching } = useAuthNavigation();

  console.log('App is rendering. isFetching:', isFetching);

  if (isFetching) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
