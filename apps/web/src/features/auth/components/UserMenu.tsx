import { useNavigate } from 'react-router';
import { ChevronsUpDownIcon, CircleUserIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/components/ui/sidebar';
import { Spinner } from '@/shared/components/ui/spinner';
import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';

import { useLogoutMutation, useMeQuery } from '../api/auth.api';

export const UserMenu = () => {
  const navigate = useNavigate();

  const { data } = useMeQuery();
  const [logout, { isLoading }] = useLogoutMutation();

  const { displayErrorToast } = useDisplayErrorToast();

  const onLogoutClick = async () => {
    try {
      await logout(undefined).unwrap();
      await navigate('/login');
    } catch (e) {
      console.error('Logout error:', e);
      displayErrorToast(e, 'Logout failed. Please try again.');
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" disabled={isLoading}>
              <CircleUserIcon />
              <span>{data?.username}</span>
              {isLoading ? (
                <Spinner className="ml-auto" />
              ) : (
                <ChevronsUpDownIcon className="ml-auto" />
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="min-w-56">
            <DropdownMenuItem onSelect={() => void onLogoutClick()}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
