import { createTRPCReact } from '@trpc/react-query';
import { AppRouter } from '../../../lambda';

export const trpc = createTRPCReact<AppRouter>();
