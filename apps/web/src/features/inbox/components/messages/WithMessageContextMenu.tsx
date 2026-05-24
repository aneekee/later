import type { ReactNode } from 'react';
import {
  CircleCheckIcon,
  CircleXIcon,
  CopyIcon,
  TrashIcon,
} from 'lucide-react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';

interface Props {
  onResolveClick?: () => void;
  onQuickResolveClick?: () => void;
  onUnresolveClick?: () => void;
  onCopyClick: () => void;
  onDeleteClick: () => void;
  children: ReactNode;
}

export const WithMessageContextMenu = ({
  onResolveClick,
  onQuickResolveClick,
  onUnresolveClick,
  onCopyClick,
  onDeleteClick,
  children,
}: Props) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="pointer-fine:select-text pointer-fine:cursor-auto">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem onClick={onCopyClick}>
            <CopyIcon />
            Copy
          </ContextMenuItem>
        </ContextMenuGroup>
        {onResolveClick ? (
          <ContextMenuGroup>
            <ContextMenuItem onClick={onResolveClick}>
              <CircleCheckIcon />
              Resolve
            </ContextMenuItem>
          </ContextMenuGroup>
        ) : null}
        {onQuickResolveClick ? (
          <ContextMenuGroup>
            <ContextMenuItem onClick={onQuickResolveClick}>
              <CircleCheckIcon />
              Quick Resolve
            </ContextMenuItem>
          </ContextMenuGroup>
        ) : null}
        {onUnresolveClick ? (
          <ContextMenuGroup>
            <ContextMenuItem onClick={onUnresolveClick}>
              <CircleXIcon />
              Unresolve
            </ContextMenuItem>
          </ContextMenuGroup>
        ) : null}
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
