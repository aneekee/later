import { Navigate } from 'react-router';
import { useMeQuery } from '../api/auth.api';

interface Props {
  children: React.ReactNode;
}

export const WithAuth = ({ children }: Props) => {
  const { data, isLoading, error } = useMeQuery(null);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!data || error) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
