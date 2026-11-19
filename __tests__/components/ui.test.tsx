import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import { Button, Choices, Empty, Field, Pill, Stepper } from '@/components/ui';

import { freshStore } from '../helpers';

const wrap = (ui: React.ReactElement) => render(<Provider store={freshStore()}>{ui}</Provider>);

describe('UI kit', () => {
  it('Button presses, and is blocked while busy', async () => {
    const onPress = jest.fn();
    const { rerender } = await wrap(<Button title="Send" onPress={onPress} />);
    await fireEvent.press(screen.getByText('Send'));
    expect(onPress).toHaveBeenCalledTimes(1);
    await rerender(
      <Provider store={freshStore()}>
        <Button title="Send" onPress={onPress} busy />
      </Provider>,
    );
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('Field shows its label and error', async () => {
    await wrap(<Field label="Your name" value="" onChangeText={() => undefined} error="Please type your name." />);
    expect(screen.getByText('Your name')).toBeTruthy();
    expect(screen.getByText('Please type your name.')).toBeTruthy();
  });

  it('Choices reports the chosen key and marks it selected', async () => {
    const onChange = jest.fn();
    await wrap(<Choices options={[{ key: 'A', label: 'Sparks' }, { key: 'B', label: 'No power' }]} value="A" onChange={onChange} />);
    await fireEvent.press(screen.getByText('No power'));
    expect(onChange).toHaveBeenCalledWith('B');
    expect(screen.getAllByRole('button', { selected: true })).toHaveLength(1);
  });

  it('Stepper stays within its limits', async () => {
    const onChange = jest.fn();
    await wrap(<Stepper value={1} min={1} max={2} onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('Less'));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('More'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('Pill and Empty render their words', async () => {
    await wrap(
      <>
        <Pill label="Overdue" tone="alert" />
        <Empty title="Nothing here" sub="All quiet" />
      </>,
    );
    expect(screen.getByText('Overdue')).toBeTruthy();
    expect(screen.getByText('All quiet')).toBeTruthy();
  });
});
