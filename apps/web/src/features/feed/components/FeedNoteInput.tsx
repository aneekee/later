import { Send } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';
import { Textarea } from '@/shared/components/ui/textarea';
import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';

import { useCreateFeedNoteMutation } from '../api/feed.api';
import { FEED_NOTE_MAX_LENGTH } from '../const/feed.constants';

/**
 * A copy of the inbox MessageInput, creates chat-less notes.
 * Pessimistic: the text is cleared only after the note is created
 */
export const FeedNoteInput = () => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [createFeedNote, { isLoading }] = useCreateFeedNoteMutation();

  const { displayErrorToast } = useDisplayErrorToast();

  const canSubmit = !!content.trim() && !isLoading;

  const onNoteSubmit = async () => {
    try {
      await createFeedNote({ body: { content } }).unwrap();
      setContent('');
      // the Send button takes the focus on click, keep typing the next note
      textareaRef.current?.focus();
    } catch (e) {
      console.error(e);
      displayErrorToast(e, 'Note create failed');
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="grow">
        {/* readOnly instead of disabled while pending, keeps the focus */}
        <Textarea
          ref={textareaRef}
          value={content}
          rows={1}
          className="min-h-0 max-h-48 resize-none"
          placeholder="Add a note…"
          readOnly={isLoading}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSubmit) {
                void onNoteSubmit();
              }
            }
          }}
          maxLength={FEED_NOTE_MAX_LENGTH}
          data-enable-grammarly="false"
        />
      </div>
      <div>
        <Button
          type="submit"
          size="icon"
          className="size-9 shrink-0"
          aria-label="Add note"
          disabled={!canSubmit}
          onClick={() => void onNoteSubmit()}
        >
          {isLoading ? <Spinner /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
};
