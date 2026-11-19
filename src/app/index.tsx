import { Redirect } from 'expo-router';

import { HOME_FOR } from '@/auth/roles';
import { useSession } from '@/auth/session';

/** Sends each person to their own dashboard. */
export default function Index() {
  const { status, user } = useSession();
  if (status !== 'signed-in' || !user) return <Redirect href="/sign-in" />;
  return <Redirect href={HOME_FOR[user.role]} />;
}
