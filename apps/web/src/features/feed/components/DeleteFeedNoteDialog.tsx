import type { NoteEntity } from '@later/types';

import { useDeleteNoteMutation } from '@/features/notes/api/notes.api';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Spinner } from '@/shared/components/ui/spinner';
import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';

interface Props {
  item: NoteEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBeforeDelete: () => void;
}

export const DeleteFeedNoteDialog = ({
  item,
  open,
  onOpenChange,
  onBeforeDelete,
}: Props) => {
  const { displayErrorToast } = useDisplayErrorToast();
  const [deleteNote, { isLoading }] = useDeleteNoteMutation();

  // can't be dismissed while the request is pending
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && isLoading) {
      return;
    }
    onOpenChange(isOpen);
  };

  // on success the note leaves the feed cache, the card unmounts with this dialog
  const onDelete = async () => {
    onBeforeDelete();
    try {
      await deleteNote({ noteId: item.id }).unwrap();
    } catch (e) {
      console.error('Delete note error:', e);
      displayErrorToast(e, 'Note delete failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete note</DialogTitle>
          <DialogDescription>
            Delete this note? This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isLoading}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isLoading}
            onClick={() => void onDelete()}
          >
            {isLoading ? <Spinner /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
