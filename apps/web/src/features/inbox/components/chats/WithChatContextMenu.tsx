import type { ReactNode } from 'react';
import { FolderInputIcon } from 'lucide-react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';

interface Props {
  onMoveClick: () => void;
  children: ReactNode;
}

export const WithChatContextMenu = ({ onMoveClick, children }: Props) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="block">{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem onClick={onMoveClick}>
            <FolderInputIcon />
            Move
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
};
