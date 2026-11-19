/**
 * The session, read from the store (src/store/slices/session.ts). Kept as a
 * small hook so screens can say `const { user, signOut } = useSession()`.
 */
import { useMemo } from 'react';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSession } from '@/store/selectors';
import * as s from '@/store/slices/session';

export type { CodeCheck, Role, User } from '@/types/api';

export function useSession() {
  const { status, user } = useAppSelector(selectSession);
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      status,
      user,
      signIn: (username: string, password: string) => dispatch(s.signIn({ username, password })).unwrap(),
      signUp: (data: s.SignUpData) => dispatch(s.signUp(data)).unwrap(),
      verifyCode: (check: string, code: string) => dispatch(s.verifyCode({ check, code })).unwrap(),
      signOut: () => dispatch(s.signOut()).unwrap(),
      refresh: () => dispatch(s.refreshMe()).unwrap(),
      updateMe: (patch: s.MePatch) => dispatch(s.updateMe(patch)).unwrap(),
      setPhoto: (uri: string | null) => dispatch(s.setPhoto(uri)).unwrap(),
    }),
    [status, user, dispatch],
  );
}
