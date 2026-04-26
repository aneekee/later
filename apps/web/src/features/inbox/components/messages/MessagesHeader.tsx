interface Props {
  title: string;
}

export const MessagesHeader = ({ title }: Props) => {
  return <header className="p-2 border-b font-semibold">{title}</header>;
};
