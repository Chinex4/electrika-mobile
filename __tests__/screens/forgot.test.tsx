import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import Forgot from '@/app/(auth)/forgot';

import { freshStore, mockFetch } from '../helpers';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
}));

const { router } = jest.requireMock('expo-router');

describe('forgotten password by code', () => {
  it('who you are, the code, then a new password', async () => {
    const { calls } = mockFetch({
      '/auth/forgot/abc/verify/': (init) =>
        JSON.parse(String(init?.body)).code === '123456'
          ? { body: { ok: true } }
          : { status: 400, body: { detail: 'That code doesn’t match.', errors: { code: ['That code doesn’t match.'] } } },
      '/auth/forgot/abc/password/': { body: { detail: 'Your password has been changed.' } },
      '/auth/forgot/': { status: 202, body: { check: 'abc', detail: 'If that matches an account, we’ve sent a code.', resend_in: 40 } },
    });
    await render(
      <Provider store={freshStore()}>
        <Forgot />
      </Provider>,
    );
    await fireEvent.press(screen.getByText('Send me a code'));
    expect(await screen.findByText('Please fill this in.')).toBeTruthy();
    expect(calls).toHaveLength(0);

    await fireEvent.changeText(screen.getByLabelText('Phone, email or username'), ' Ada ');
    await fireEvent.press(screen.getByText('Send me a code'));
    expect(await screen.findByText('If that matches an account, we’ve sent a code.')).toBeTruthy();
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ identifier: 'Ada' });

    await fireEvent.changeText(screen.getByLabelText('Code'), '111111');
    expect(await screen.findByText('That code doesn’t match.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Code'), '123456');
    expect(await screen.findByText('Choose a new password')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('New password'), 'Fresh-pass-1');
    await fireEvent.changeText(screen.getByLabelText('New password again'), 'Fresh-pass-2');
    await fireEvent.press(screen.getByText('Set password'));
    expect(await screen.findByText('The two passwords don’t match.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('New password again'), 'Fresh-pass-1');
    await fireEvent.press(screen.getByText('Set password'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/sign-in'));
    expect(calls.map((c) => c.path)).toEqual(['/auth/forgot/', '/auth/forgot/abc/verify/', '/auth/forgot/abc/verify/', '/auth/forgot/abc/password/']);
  });
});
