import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import { Field } from '@/components/ui';

import { freshStore } from '../helpers';

describe('password fields', () => {
  it('hide what is typed until the eye is tapped, and hide it again', async () => {
    await render(
      <Provider store={freshStore()}>
        <Field label="Password" value="secret" onChangeText={() => undefined} secureTextEntry placeholder="Your password" />
      </Provider>,
    );
    const input = screen.getByLabelText('Password');
    expect(input.props.secureTextEntry).toBe(true);
    expect(input.props.placeholder).toBe('Your password');
    await fireEvent.press(screen.getByLabelText('Show password'));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByLabelText('Hide password'));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  it('other fields get no eye', async () => {
    await render(
      <Provider store={freshStore()}>
        <Field label="Your name" value="" onChangeText={() => undefined} />
      </Provider>,
    );
    expect(screen.queryByLabelText('Show password')).toBeNull();
  });
});
