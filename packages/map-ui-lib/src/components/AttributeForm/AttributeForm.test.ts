import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { AttributeForm, attributeInputKind, type AttributeColumn } from './AttributeForm';

const COLUMNS: AttributeColumn[] = [
  { name: 'name', dataType: 'character varying', udtName: 'varchar', nullable: false },
  { name: 'population', dataType: 'integer', udtName: 'int4', nullable: true },
  { name: 'is_capital', dataType: 'boolean', udtName: 'bool', nullable: true },
  { name: 'founded', dataType: 'date', udtName: 'date', nullable: true },
  { name: 'updated_at', dataType: 'timestamp with time zone', udtName: 'timestamptz', nullable: true },
];

describe('attributeInputKind', () => {
  it('maps numeric data types and udt names', () => {
    expect(attributeInputKind({ name: 'a', dataType: 'integer', nullable: true })).toBe('number');
    expect(attributeInputKind({ name: 'a', dataType: 'numeric', nullable: true })).toBe('number');
    expect(attributeInputKind({ name: 'a', dataType: 'double precision', nullable: true })).toBe('number');
    expect(attributeInputKind({ name: 'a', dataType: 'x', udtName: 'float8', nullable: true })).toBe('number');
  });

  it('maps boolean, date and timestamp', () => {
    expect(attributeInputKind({ name: 'a', dataType: 'boolean', nullable: true })).toBe('boolean');
    expect(attributeInputKind({ name: 'a', dataType: 'date', nullable: true })).toBe('date');
    expect(attributeInputKind({ name: 'a', dataType: 'timestamp with time zone', nullable: true })).toBe('datetime');
  });

  it('falls back to text', () => {
    expect(attributeInputKind({ name: 'a', dataType: 'character varying', nullable: true })).toBe('text');
    expect(attributeInputKind({ name: 'a', dataType: 'jsonb', nullable: true })).toBe('text');
  });
});

describe('AttributeForm rendering', () => {
  const html = renderToStaticMarkup(
    createElement(AttributeForm, {
      columns: COLUMNS,
      values: { name: 'Springfield', population: 30000, is_capital: false },
      onChange: () => {},
    }),
  );

  it('renders a label per column', () => {
    for (const col of COLUMNS) {
      expect(html).toContain(`>${col.name}`);
    }
  });

  it('marks non-nullable columns as required (asterisk)', () => {
    // The required name field renders the red asterisk span.
    expect(html).toContain('*');
    expect(html).toContain('for="attr-name"');
  });

  it('chooses input types from data types', () => {
    expect(html).toContain('id="attr-population" type="number"');
    expect(html).toContain('id="attr-founded" type="date"');
    expect(html).toContain('id="attr-updated_at" type="datetime-local"');
    // boolean column renders a <select>
    expect(html).toContain('id="attr-is_capital"');
    expect(html).toContain('<select');
  });

  it('reflects values into inputs', () => {
    expect(html).toContain('value="Springfield"');
    expect(html).toContain('value="30000"');
  });

  it('honours a custom idPrefix', () => {
    const out = renderToStaticMarkup(
      createElement(AttributeForm, {
        columns: [COLUMNS[0]],
        values: {},
        onChange: () => {},
        idPrefix: 'row',
      }),
    );
    expect(out).toContain('id="row-name"');
  });

  it('renders an error message when provided', () => {
    const out = renderToStaticMarkup(
      createElement(AttributeForm, {
        columns: COLUMNS,
        values: {},
        onChange: () => {},
        errors: { name: 'Name is required.' },
      }),
    );
    expect(out).toContain('Name is required.');
  });
});
