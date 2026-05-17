import { useState } from 'react';
import type { ReactNode } from 'react';

import type { MessageResolution } from '@later/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { formatIsoDateTime } from '@/shared/utils/date.util';
import { CheckCheckIcon } from 'lucide-react';

interface Props {
  messageResolution: MessageResolution;
  children: ReactNode;
}

export const WithMessageItemResolution = ({
  messageResolution,
  children,
}: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="w-fit rounded-lg bg-gray-300 overflow-hidden">
        {children}
        <div className="px-2 py-1 w-full flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <CheckCheckIcon size="14px" />
          <button
            type="button"
            className={
              messageResolution.note
                ? 'underline underline-offset-2 hover:text-foreground transition-colors'
                : ''
            }
            onClick={messageResolution.note ? () => setOpen(true) : undefined}
          >
            Resolved
          </button>
        </div>
      </div>

      {messageResolution.note ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolution Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  Resolved At
                </p>
                <p className="text-sm">
                  {formatIsoDateTime(messageResolution.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  Note
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {messageResolution.note}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
};
