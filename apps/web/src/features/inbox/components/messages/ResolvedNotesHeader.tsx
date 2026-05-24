import { Search } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

interface Props {
  isSearchOpen: boolean;
  onSearchToggle: () => void;
}

export const ResolvedNotesHeader = ({
  isSearchOpen,
  onSearchToggle,
}: Props) => {
  return (
    <header className="flex items-center justify-between p-2 border-b font-semibold">
      <span>Resolved Notes</span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onSearchToggle}
        aria-pressed={isSearchOpen}
        aria-label="Toggle search panel"
        className={isSearchOpen ? 'bg-muted text-foreground' : ''}
      >
        <Search />
      </Button>
    </header>
  );
};
