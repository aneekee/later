import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useLazyMeQuery } from '../api/auth.api';

export const useAuthNavigation = () => {
  const [initFetched, setInitFetched] = useState(false);

  const [fetchMe, { isFetching, isError }] = useLazyMeQuery();

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data: user } = await fetchMe(null).unwrap();
        if (user) {
          navigate('/');
        } else {
          navigate('/login');
        }
      } catch (error) {
        navigate('/login');
        console.error('Error fetching user data:', error);
      } finally {
        setInitFetched(true);
      }
    })();
  }, [fetchMe, navigate]);

  return {
    isFetching: isFetching || !initFetched,
    isError,
  };
};
