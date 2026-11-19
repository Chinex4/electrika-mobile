import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import SignIn from '@/app/(auth)/sign-in';
import { tokenStore } from '@/api/client';

import { freshStore, mockFetch, user } from '../helpers';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    useFocusEffect: jest.fn(),
  };
});

const { router } = jest.requireMock('expo-router');

describe('sign-in screen', () => {
  beforeEach(async () => {
    await tokenStore.clear();
    jest.clearAllMocks();
  });

  it('asks for both fields before calling the server', async () => {
    const { fn } = mockFetch({});
    await render(
      <Provider store={freshStore()}>
        <SignIn />
      </Provider>,
    );
    await fireEvent.press(screen.getByText('Sign in'));
    expect(await screen.findByText('Type your phone number or email, and your password.')).toBeTruthy();
    expect(fn).not.toHaveBeenCalled();
  });

  it('signs in and goes to the dashboard', async () => {
    const { calls } = mockFetch({ '/auth/token/': { body: { token: 'tok', user } } });
    const store = freshStore();
    await render(
      <Provider store={store}>
        <SignIn />
      </Provider>,
    );
    await fireEvent.changeText(screen.getByLabelText('Phone number or email'), '08030000000');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'secret-pass');
    await fireEvent.press(screen.getByText('Sign in'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({ username: '08030000000', password: 'secret-pass' });
    expect(store.getState().session.status).toBe('signed-in');
  });

  it('shows the server message when the details are wrong', async () => {
    mockFetch({ '/auth/token/': { status: 400, body: { detail: "Those details don't match an account." } } });
    await render(
      <Provider store={freshStore()}>
        <SignIn />
      </Provider>,
    );
    await fireEvent.changeText(screen.getByLabelText('Phone number or email'), 'x');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'y');
    await fireEvent.press(screen.getByText('Sign in'));
    expect(await screen.findByText("Those details don't match an account.")).toBeTruthy();
  });
});
