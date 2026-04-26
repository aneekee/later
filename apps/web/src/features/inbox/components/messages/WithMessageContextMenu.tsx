import type { ReactNode } from 'react';
import { CopyIcon, TrashIcon } from 'lucide-react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';

interface Props {
  onCopyClick: () => void;
  onDeleteClick: () => void;
  children: ReactNode;
}

export const WithMessageContextMenu = ({
  onCopyClick,
  onDeleteClick,
  children,
}: Props) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem onClick={onCopyClick}>
            <CopyIcon />
            Copy
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuGroup>
          <ContextMenuItem variant="destructive" onClick={onDeleteClick}>
            <TrashIcon />
            Delete
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
};
