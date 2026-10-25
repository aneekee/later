import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: number;
  icon: LucideIcon;
}

export const NotesStatsCard = ({ label, value, icon: Icon }: Props) => {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <Icon className="size-4" />
      </div>
      <p className="text-3xl font-semibold tabular-nums">
        {value.toLocaleString('en-US')}
      </p>
    </div>
  );
};
