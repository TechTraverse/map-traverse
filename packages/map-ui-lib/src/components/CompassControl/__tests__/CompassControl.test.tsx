import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompassControl } from '../CompassControl';

describe('CompassControl', () => {
  it('rotates the needle by the negative of the bearing (plus a -45° icon offset)', () => {
    const html = renderToStaticMarkup(
      <CompassControl bearing={45} onReset={() => {}} />,
    );
    // Bearing 45° → -45° counter-rotation, plus -45° to correct LuCompass's
    // NE-tilted needle back to north → -90° total.
    expect(html).toContain('rotate(-90deg)');
  });

  it('renders rotate(-45deg) at bearing 0 (LuCompass north-correction offset)', () => {
    const html = renderToStaticMarkup(
      <CompassControl bearing={0} onReset={() => {}} />,
    );
    expect(html).toContain('rotate(-45deg)');
  });

  it('exposes an accessible label', () => {
    const html = renderToStaticMarkup(
      <CompassControl bearing={0} onReset={() => {}} ariaLabel="Reset north" />,
    );
    expect(html).toContain('aria-label="Reset north"');
  });

  it('invokes onReset when the button onClick handler fires', () => {
    // Static markup test — verify the component wires the handler by rendering
    // and inspecting via a thin React.createElement call.
    const onReset = vi.fn();
    const element = CompassControl({ bearing: 90, onReset });
    // The root element is a <button> whose onClick is our handler.
    expect((element as { props: { onClick: () => void } }).props.onClick).toBe(onReset);
    (element as { props: { onClick: () => void } }).props.onClick();
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
