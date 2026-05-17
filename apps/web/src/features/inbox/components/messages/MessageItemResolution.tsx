import { useState } from 'react';
import { CircleCheckIcon } from 'lucide-react';

import type { MessageResolution } from '@later/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { formatIsoDateTime } from '@/shared/utils/date.util';

interface Props {
  messageResolution: MessageResolution;
}

export const MessageItemResolution = ({ messageResolution }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex justify-end">
      <div className="flex items-end gap-1.5 text-xs text-muted-foreground mb-1">
        <CircleCheckIcon className="size-3.5 shrink-0" />
        <span>Resolved</span>
        {messageResolution.note ? (
          <button
            type="button"
            className="ml-1 underline underline-offset-2 hover:text-foreground transition-colors"
            onClick={() => setOpen(true)}
          >
            View Details
          </button>
        ) : null}
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
    </div>
  );
};
