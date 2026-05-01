interface Props {
  title: string;
}

export const MessageDateSeparator = ({ title }: Props) => {
  return (
    <div className="flex items-center self-center gap-3 w-10/12">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium shrink-0">
        {title}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
};
