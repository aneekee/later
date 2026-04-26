import { MessageSquarePlus } from 'lucide-react';

export const ChatListEmpty = () => {
  return (
    <div className="w-full flex flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <MessageSquarePlus className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">No chats yet</p>
        <p className="text-xs text-muted-foreground">Create one to get going</p>
      </div>
    </div>
  );
};
