import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { CodeInput, Field, HeroCard } from '@/components/ui';
import { isNigerianMobile, rules, validate } from '@/lib/validate';

import { freshStore } from '../helpers';

const wrap = (ui: React.ReactElement) => render(<Provider store={freshStore()}>{ui}</Provider>);

function Code({ onComplete }: { onComplete: (c: string) => void }) {
  const [v, setV] = useState('');
  return <CodeInput label="Code" value={v} onChange={setV} onComplete={onComplete} />;
}

describe('6-box code input', () => {
  it('fills one box per digit, takes a pasted code, and backspaces', async () => {
    const done = jest.fn();
    await wrap(<Code onComplete={done} />);
    const input = screen.getByLabelText('Code');
    await fireEvent.changeText(input, '12');
    expect(screen.getByTestId('code-box-0')).toHaveTextContent('1');
    expect(screen.getByTestId('code-box-1')).toHaveTextContent('2');
    expect(screen.getByTestId('code-box-2')).toHaveTextContent('');
    expect(done).not.toHaveBeenCalled();
    // Pasting a whole message still gives the six digits, and completes.
    await fireEvent.changeText(input, 'Your code is 654 321.');
    expect(screen.getByTestId('code-box-5')).toHaveTextContent('1');
    expect(done).toHaveBeenCalledWith('654321');
    await fireEvent.changeText(input, '65432');
    expect(screen.getByTestId('code-box-5')).toHaveTextContent('');
    expect(done).toHaveBeenCalledTimes(1);
  });
});

describe('form checks', () => {
  it('match the server rules', () => {
    for (const ok of ['0803 123 4567', '+234 803 123 4567', '2348031234567', '803-123-4567']) expect(isNigerianMobile(ok)).toBe(true);
    for (const bad of ['0603 123 4567', '12345', '']) expect(isNigerianMobile(bad)).toBe(false);
    const errors = validate(
      { phone: '123', email: 'a@b', password: '12345678', again: 'x', code: '12 34', name: ' ' },
      {
        phone: [rules.required, rules.phone],
        email: [rules.email],
        password: [rules.password],
        again: [rules.sameAs('password')],
        code: [rules.code],
        name: [rules.required],
      },
      'en',
    );
    expect(errors).toEqual({
      phone: 'Type a Nigerian mobile number, for example 0803 123 4567.',
      email: 'That email address doesn’t look right.',
      password: 'Use some letters too, not just numbers.',
      again: 'The two passwords don’t match.',
      code: 'Type all 6 digits of the code.',
      name: 'Please fill this in.',
    });
    expect(validate({ name: '' }, { name: [rules.required] }, 'ig').name).toBe('Biko dejupụta nke a.');
  });
});

describe('inputs and cards', () => {
  it('a one-line field has no lineHeight, so iOS keeps the text where it is while typing', async () => {
    await wrap(<Field label="Name" value="" onChangeText={() => undefined} />);
    const style = StyleSheet.flatten(screen.getByLabelText('Name').props.style);
    expect(style.lineHeight).toBeUndefined();
    expect(style.fontSize).toBe(16);
  });

  it('the hero card is the flat ElectriKa blue', async () => {
    await wrap(<HeroCard>{null}</HeroCard>);
    const card = screen.toJSON() as unknown as { props: { style: unknown } };
    expect(StyleSheet.flatten(card.props.style as never).backgroundColor).toBe('#0051A2');
  });
});

describe('launch animation', () => {
  it('waits for the app, at least long enough to draw the mark, then finishes', async () => {
    jest.useFakeTimers();
    const done = jest.fn();
    const { rerender } = await wrap(<AnimatedSplash ready={false} onDone={done} />);
    await act(() => jest.advanceTimersByTime(5000));
    expect(done).not.toHaveBeenCalled();
    await rerender(
      <Provider store={freshStore()}>
        <AnimatedSplash ready onDone={done} />
      </Provider>,
    );
    await act(() => jest.advanceTimersByTime(2500));
    await waitFor(() => expect(done).toHaveBeenCalled());
    jest.useRealTimers();
  });
});
