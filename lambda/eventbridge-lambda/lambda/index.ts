import { EventBridgeHandler } from 'aws-lambda';

// eslint-disable-next-line import/prefer-default-export
export const handler: EventBridgeHandler<string, {}, void> = async ({ time }) => {
  const timestamp = new Intl.DateTimeFormat('UTC', {
    calendar: 'iso8601',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(time));
  // eslint-disable-next-line no-console
  console.log(timestamp);
  const date = new Date(time);
  // eslint-disable-next-line no-console
  console.log(`${date.getFullYear()}${`00${date.getMonth() + 1}`.slice(-2)}${`00${date.getDate()}`.slice(-2)}${`00${date.getHours()}`.slice(-2)}00`);
};
