import type { MessageResolutionFilter } from '@later/types';

import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/shared/components/ui/toggle-group';

import { RESOLUTION_OPTIONS } from '../../const/chats.constants';

interface Props {
  resolution: MessageResolutionFilter;
  onResolutionChange: (value: MessageResolutionFilter) => void;
}

export const ChatSearchPanel = ({ resolution, onResolutionChange }: Props) => {
  return (
    <div className="border-b animate-in slide-in-from-top-2 fade-in-0 duration-150">
      <div className="flex justify-end">
        <div className="flex items-center px-2 py-1.5">
          <ToggleGroup
            size="sm"
            type="single"
            variant="outline"
            value={resolution}
            onValueChange={(value) => {
              if (value) {
                onResolutionChange(value as MessageResolutionFilter);
              }
            }}
          >
            {RESOLUTION_OPTIONS.map(({ value, label }) => (
              <ToggleGroupItem key={value} value={value} size="sm">
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
};
