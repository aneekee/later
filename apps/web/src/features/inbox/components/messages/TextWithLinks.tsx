import { URL_REGEX } from '../../const/message.constants';

interface Props {
  text: string;
}

export const TextWithLinks = ({ text }: Props) => {
  const parts = text.split(URL_REGEX);
  const matches = text.match(URL_REGEX) ?? [];

  return parts.flatMap((part, i) =>
    i < matches.length
      ? [
          part,
          <a
            key={i}
            href={matches[i]}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600 hover:text-blue-800"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          >
            {matches[i]}
          </a>,
        ]
      : [part],
  );
};
