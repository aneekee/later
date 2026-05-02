import { formatIsoTime, formatIsoDateTime } from '@/shared/utils/date.util';

import { TextWithLinks } from './TextWithLinks';

interface Props {
  textContent: string;
  date: string;
}

export const TextMessage = ({ textContent, date }: Props) => {
  return (
    <div className="relative py-1 px-2 w-fit text-sm rounded-lg bg-gray-200">
      <p>
        <TextWithLinks text={textContent} />
        <span className="inline-block w-14" aria-hidden="true" />
      </p>
      <span
        className="absolute bottom-1 right-1 text-xs text-gray-500 leading-none"
        title={formatIsoDateTime(date)}
      >
        {formatIsoTime(date)}
      </span>
    </div>
  );
};
