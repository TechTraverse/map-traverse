// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Tell React 18 we're in an act-aware environment so it stops warning.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { GlobalSearchBar } from './GlobalSearchBar';
import type {
  FeatureMatch,
  GlobalSearchBarProps,
  GroupedResults,
} from './GlobalSearchBar';
import type { GlobalSearchConfig, LayerConfig } from '../../types';

const config: GlobalSearchConfig = {
  enabled: true,
  placeholder: 'Search…',
  maxResultsPerLayer: 10,
  debounceMs: 250,
  minQueryLength: 2,
  position: 'top-left',
  width: 'md',
  layers: [],
};

const countriesLayer: LayerConfig = {
  id: 'countries',
  sourceId: 'tipg',
  collection: 'ne_110m_admin_0_countries',
  label: 'Countries',
  visible: true,
  dataMode: 'vector-tiles',
  styles: [{ type: 'fill', paint: { 'fill-color': '#000', 'fill-opacity': 1 } }],
};

const citiesLayer: LayerConfig = {
  id: 'cities',
  sourceId: 'tipg',
  collection: 'ne_110m_populated_places',
  label: 'Populated Places',
  visible: true,
  dataMode: 'geojson',
  styles: [{ type: 'circle', paint: { 'circle-color': '#000', 'circle-radius': 3, 'circle-opacity': 1 } }],
};

const countryMatches: FeatureMatch[] = [
  { id: 1, label: 'France', matchedProperty: 'name' },
  { id: 2, label: 'French Polynesia', matchedProperty: 'name' },
];

const cityMatches: FeatureMatch[] = [
  { id: 'c1', label: 'Frankfurt', matchedProperty: 'name' },
];

let container: HTMLDivElement;
let root: Root;

function render(ui: React.ReactElement) {
  act(() => {
    root.render(ui);
  });
}

function makeProps(overrides: Partial<GlobalSearchBarProps> = {}): GlobalSearchBarProps {
  return {
    config,
    layers: [countriesLayer],
    value: '',
    onChange: vi.fn(),
    results: {} as GroupedResults,
    onResultClick: vi.fn(),
    isLoading: false,
    ...overrides,
  };
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function getInput(): HTMLInputElement {
  const input = container.querySelector('input');
  if (!input) throw new Error('input not found');
  return input as HTMLInputElement;
}

function focusInput() {
  const input = getInput();
  act(() => {
    input.focus();
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  });
}

function type(text: string) {
  const input = getInput();
  act(() => {
    // Use the React-compatible value setter so onChange fires.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;
    setter.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function keyDown(key: string) {
  const input = getInput();
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

describe('GlobalSearchBar', () => {
  it('fires onChange when the user types', () => {
    const onChange = vi.fn();
    render(<GlobalSearchBar {...makeProps({ onChange })} />);
    type('fr');
    expect(onChange).toHaveBeenCalledWith('fr');
  });

  it('does NOT open the dropdown when value is below minQueryLength and no results', () => {
    render(<GlobalSearchBar {...makeProps({ value: 'f' })} />);
    focusInput();
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('renders the empty state when query meets minQueryLength but results are empty', () => {
    render(<GlobalSearchBar {...makeProps({ value: 'zz' })} />);
    focusInput();
    const empty = container.querySelector('[data-testid="global-search-empty"]');
    expect(empty).not.toBeNull();
    expect(empty!.textContent).toContain('No results');
  });

  it('renders the loading state when isLoading is true', () => {
    render(<GlobalSearchBar {...makeProps({ value: 'fr', isLoading: true })} />);
    focusInput();
    const loading = container.querySelector('[data-testid="global-search-loading"]');
    expect(loading).not.toBeNull();
    expect(loading!.textContent).toContain('Searching');
  });

  it('renders multiple layer groups', () => {
    const results: GroupedResults = {
      countries: { layer: countriesLayer, matches: countryMatches },
      cities: { layer: citiesLayer, matches: cityMatches },
    };
    render(
      <GlobalSearchBar
        {...makeProps({
          value: 'fr',
          layers: [countriesLayer, citiesLayer],
          results,
        })}
      />,
    );
    focusInput();
    expect(container.querySelector('[data-testid="global-search-group-countries"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="global-search-group-cities"]')).not.toBeNull();
    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
  });

  it('fires onResultClick when a row is clicked', () => {
    const onResultClick = vi.fn();
    render(
      <GlobalSearchBar
        {...makeProps({
          value: 'fr',
          results: { countries: { layer: countriesLayer, matches: countryMatches } },
          onResultClick,
        })}
      />,
    );
    focusInput();
    const row = container.querySelector('[data-testid="global-search-result-countries-1"]') as HTMLElement;
    expect(row).not.toBeNull();
    act(() => {
      row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(onResultClick).toHaveBeenCalledTimes(1);
    expect(onResultClick).toHaveBeenCalledWith('countries', countryMatches[0]);
  });

  it('ArrowDown highlights the first row and Enter fires onResultClick', () => {
    const onResultClick = vi.fn();
    render(
      <GlobalSearchBar
        {...makeProps({
          value: 'fr',
          results: { countries: { layer: countriesLayer, matches: countryMatches } },
          onResultClick,
        })}
      />,
    );
    focusInput();
    keyDown('ArrowDown');
    const firstRow = container.querySelector('[data-testid="global-search-result-countries-1"]')!;
    expect(firstRow.getAttribute('aria-selected')).toBe('true');
    keyDown('Enter');
    expect(onResultClick).toHaveBeenCalledWith('countries', countryMatches[0]);
  });

  it('Escape closes the dropdown', () => {
    render(
      <GlobalSearchBar
        {...makeProps({
          value: 'fr',
          results: { countries: { layer: countriesLayer, matches: countryMatches } },
        })}
      />,
    );
    focusInput();
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();
    keyDown('Escape');
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });
});
