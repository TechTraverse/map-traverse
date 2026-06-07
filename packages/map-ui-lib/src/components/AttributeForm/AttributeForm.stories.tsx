import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AttributeForm, type AttributeColumn } from './AttributeForm';

const meta: Meta<typeof AttributeForm> = {
  title: 'Data/AttributeForm',
  component: AttributeForm,
  parameters: {
    docs: {
      description: {
        component:
          'Controlled attribute editor. Renders one input per column, choosing the input type from the column Postgres data type (number / boolean / date / datetime / text).',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof AttributeForm>;

const COLUMNS: AttributeColumn[] = [
  { name: 'name', dataType: 'character varying', udtName: 'varchar', nullable: false },
  { name: 'population', dataType: 'integer', udtName: 'int4', nullable: true },
  { name: 'area_km2', dataType: 'double precision', udtName: 'float8', nullable: true },
  { name: 'is_capital', dataType: 'boolean', udtName: 'bool', nullable: true },
  { name: 'founded', dataType: 'date', udtName: 'date', nullable: true },
  { name: 'updated_at', dataType: 'timestamp with time zone', udtName: 'timestamptz', nullable: true },
];

function Demo({ withErrors }: { withErrors?: boolean }) {
  const [values, setValues] = useState<Record<string, unknown>>({
    name: 'Springfield',
    population: 30000,
    is_capital: false,
  });
  return (
    <div className="mapui:w-80">
      <AttributeForm
        columns={COLUMNS}
        values={values}
        onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
        errors={withErrors ? { name: 'Name is required.' } : undefined}
      />
      <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-2 mapui:text-xs">
        {JSON.stringify(values, null, 2)}
      </pre>
    </div>
  );
}

export const Default: Story = {
  render: () => <Demo />,
};

export const WithError: Story = {
  render: () => <Demo withErrors />,
};
