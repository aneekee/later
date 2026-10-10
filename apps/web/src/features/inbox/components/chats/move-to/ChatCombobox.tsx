import { useEffect, useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';

import type { ChatEntity } from '@later/types';

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/shared/components/ui/combobox';
import { Spinner } from '@/shared/components/ui/spinner';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/lib/utils';
import { useChatsInfiniteQuery } from '@/features/inbox/api/chats.api';
import { CHATS_DEFAULT_PAGINATION } from '@/features/inbox/const/chats.constants';

interface Props {
  id?: string;
  value: string;
  onChange: (chatId: string) => void;
  excludeChatId: string;
  invalid?: boolean;
  showClear?: boolean;
}

export const ChatCombobox = ({
  id,
  value,
  onChange,
  excludeChatId,
  invalid,
  showClear,
}: Props) => {
  const [search, setSearch] = useState('');
  const [selectedChat, setSelectedChat] = useState<ChatEntity | null>(null);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { data, isFetching, isError, fetchNextPage, hasNextPage } =
    useChatsInfiniteQuery({
      ...CHATS_DEFAULT_PAGINATION,
      search: debouncedSearch || undefined,
      excludeId: excludeChatId,
    });

  const chatsList = useMemo(
    () =>
      (data?.pages.flat() ?? [])
        .map((r) => r.data?.list ?? [])
        .reduce((acc, item) => acc.concat(item), []),
    [data],
  );

  const selected = selectedChat?.id === value ? selectedChat : null;

  // Portal the popup next to the input: a modal Radix dialog blocks pointer events and wheel scroll outside of itself
  const [popupContainer, setPopupContainer] = useState<HTMLDivElement | null>(
    null,
  );

  // The popup mounts after the open render, so a plain ref would still be null in the effect
  const [bottomSentinel, setBottomSentinel] = useState<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    if (!bottomSentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetching && hasNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(bottomSentinel);

    return () => {
      observer.disconnect();
    };
  }, [bottomSentinel, fetchNextPage, isFetching, hasNextPage]);

  const onValueChange = (chat: ChatEntity | null) => {
    setSelectedChat(chat);
    onChange(chat?.id ?? '');
  };

  const renderEmpty = () => {
    if (isFetching) {
      return 'Loading...';
    }

    if (isError) {
      return 'Failed to load chats';
    }

    return 'No chats found';
  };

  return (
    <div ref={setPopupContainer}>
      <Combobox<ChatEntity>
        items={chatsList}
        filter={null}
        value={selected}
        onValueChange={onValueChange}
        onInputValueChange={(inputValue, { reason }) => {
          // Selecting an item fills the input with its title, which shouldn't become the search query
          if (reason === 'input-change' || reason === 'input-clear') {
            setSearch(inputValue);
          }
        }}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSearch('');
          }
        }}
        itemToStringLabel={(chat) => chat.title}
        isItemEqualToValue={(chat, other) => chat.id === other.id}
      >
        <ComboboxInput
          id={id}
          className="w-full"
          placeholder="Search chats..."
          aria-invalid={invalid}
          showClear={showClear}
        />
        <ComboboxContent container={popupContainer}>
          <ComboboxEmpty>{renderEmpty()}</ComboboxEmpty>
          <ComboboxList>
            {chatsList.map((c) => (
              <ComboboxItem key={c.id} value={c}>
                <MessageSquare className="text-muted-foreground" />
                <span className="truncate">{c.title}</span>
              </ComboboxItem>
            ))}
            {hasNextPage ? (
              <div
                ref={setBottomSentinel}
                className={cn(
                  'flex justify-center py-1',
                  !isFetching && 'invisible',
                )}
              >
                <Spinner />
              </div>
            ) : null}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
};
