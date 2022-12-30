import { createReactQueryHooks } from '@trpc/react';
import { AppRouter } from '../../../lambda';

export const trpc = createReactQueryHooks<AppRouter>();
