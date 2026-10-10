import type { ReactNode } from 'react';
import { FolderInputIcon, Trash2Icon } from 'lucide-react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';

interface Props {
  onMoveClick: () => void;
  onDeleteClick: () => void;
  children: ReactNode;
}

export const WithChatContextMenu = ({
  onMoveClick,
  onDeleteClick,
  children,
}: Props) => {
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
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem variant="destructive" onClick={onDeleteClick}>
            <Trash2Icon />
            Delete
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
};
