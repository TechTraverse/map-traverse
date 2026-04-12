import { describe, it, expect } from 'vitest';
import { resolveEffectiveLayout } from '../mapPreviewLayout';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('resolveEffectiveLayout', () => {
  it('returns "individual" when controlLayout is undefined', () => {
    expect(resolveEffectiveLayout(undefined, false)).toBe('individual');
    expect(resolveEffectiveLayout(undefined, true)).toBe('individual');
  });

  it('returns "individual" when controlLayout is "individual"', () => {
    expect(resolveEffectiveLayout('individual', false)).toBe('individual');
    expect(resolveEffectiveLayout('individual', true)).toBe('individual');
  });

  it('returns "side-menu" when controlLayout is "side-menu"', () => {
    expect(resolveEffectiveLayout('side-menu', false)).toBe('side-menu');
    expect(resolveEffectiveLayout('side-menu', true)).toBe('side-menu');
  });

  it('returns "side-menu" on narrow viewport when controlLayout is "auto"', () => {
    expect(resolveEffectiveLayout('auto', true)).toBe('side-menu');
  });

  it('returns "individual" on wide viewport when controlLayout is "auto"', () => {
    expect(resolveEffectiveLayout('auto', false)).toBe('individual');
  });
});

describe('MapPreview showExportPdf parity', () => {
  // Structural check: both the side-menu branch and the individual branch
  // must reference showExportPdf. This catches the exact drift that caused
  // FOLLOWUP §3 — MapPreview only checked showExportButton, ignoring the
  // PDF flag entirely.
  const source = readFileSync(join(__dirname, '../MapPreview.tsx'), 'utf-8');

  it('references showExportPdf in the side-menu render branch', () => {
    const sideMenuStart = source.indexOf("effectiveLayout === 'side-menu'");
    expect(sideMenuStart).toBeGreaterThan(-1);
    // The side-menu branch ends where the individual branch starts
    const individualStart = source.indexOf("effectiveLayout === 'individual'");
    const sideMenuSection = source.slice(sideMenuStart, individualStart);
    expect(sideMenuSection).toContain('showExportPdf');
  });

  it('references showExportPdf in the individual render branch', () => {
    const individualStart = source.indexOf("effectiveLayout === 'individual'");
    expect(individualStart).toBeGreaterThan(-1);
    // Read to end of file — individual branch is the last render branch
    const individualSection = source.slice(individualStart);
    expect(individualSection).toContain('showExportPdf');
  });
});
