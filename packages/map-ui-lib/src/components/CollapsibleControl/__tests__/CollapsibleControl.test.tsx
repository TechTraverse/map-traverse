import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CollapsibleControl } from '../CollapsibleControl';

function FakeIcon({ size, className }: { size?: number; className?: string }) {
  return <svg width={size} height={size} className={className} />;
}

describe('CollapsibleControl panel overflow', () => {
  const html = renderToStaticMarkup(
    <CollapsibleControl icon={FakeIcon} label="Search" defaultCollapsed={false}>
      <div>content</div>
    </CollapsibleControl>,
  );

  it('renders the expanded panel as a flex column so the header and body can split', () => {
    expect(html).toContain('mapui:flex-col');
  });

  it('scrolls overflowing content inside the panel body', () => {
    expect(html).toContain('mapui:overflow-y-auto');
    expect(html).toContain('mapui:min-h-0');
  });
});
