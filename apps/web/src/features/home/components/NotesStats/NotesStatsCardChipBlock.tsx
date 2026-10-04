import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
}

export const ChipBlock = ({ title, children }: Props) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs text-muted-foreground">{title}</span>
    <div className="grid grid-cols-3 gap-2">{children}</div>
  </div>
);
