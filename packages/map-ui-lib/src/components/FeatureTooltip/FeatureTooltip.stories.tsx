import type { Meta, StoryObj } from '@storybook/react';
import { FeatureTooltip } from './FeatureTooltip';
import type { FeatureTooltipProps } from './FeatureTooltip';

const sampleProperties = {
  name: 'United States',
  iso_a2: 'US',
  pop_est: 331002651,
  continent: 'North America',
  capital: 'Washington D.C.',
  active: true,
  tags: ['country', 'g7'],
};

const meta: Meta<FeatureTooltipProps> = {
  title: 'Components/FeatureTooltip',
  component: FeatureTooltip,
  parameters: {
    docs: {
      description: {
        component:
          'A compact presentational tooltip for hover-on-map interactions. No positioning logic — the app handles placement via MapLibre mouse events. Use maxItems to limit visible properties.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<FeatureTooltipProps>;

/** Default tooltip with title and first 4 properties. */
export const Default: Story = {
  args: {
    title: 'United States',
    properties: sampleProperties,
    maxItems: 4,
  },
};

/** Tooltip without a title header. */
export const NoTitle: Story = {
  args: {
    properties: sampleProperties,
    maxItems: 4,
  },
};

/** Properties truncated to 2 — shows "+N more" indicator. */
export const TruncatedProperties: Story = {
  args: {
    title: 'Feature',
    properties: sampleProperties,
    maxItems: 2,
  },
};

/** Null properties — shows minimal "No data" fallback. */
export const NullProperties: Story = {
  args: {
    title: 'Empty Feature',
    properties: null,
  },
};

/** Mixed value types: numbers, booleans, arrays, objects, null. */
export const MixedTypes: Story = {
  args: {
    title: 'Mixed',
    properties: {
      count: 42,
      active: true,
      tags: ['a', 'b', 'c'],
      meta: { version: 1 },
      missing: null,
    },
    maxItems: 5,
  },
};
