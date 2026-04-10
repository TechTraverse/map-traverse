import type { Meta, StoryObj } from '@storybook/react';
import { InfoModal } from './InfoModal';
import type { InfoModalProps } from './InfoModal';

const meta: Meta<InfoModalProps> = {
  title: 'Components/InfoModal',
  component: InfoModal,
  parameters: {
    docs: {
      description: {
        component:
          'Centered modal dialog that renders a Markdown body (via react-markdown + remark-gfm). Links open in a new tab. Dismissable via X button, ESC key, or backdrop click.',
      },
    },
  },
  argTypes: {
    onClose: { action: 'close' },
  },
};

export default meta;

type Story = StoryObj<InfoModalProps>;

export const Default: Story = {
  args: {
    open: true,
    title: 'About this map',
    markdown:
      'This map shows **sample data** for demonstration purposes. Pan and zoom to explore.',
  },
};

export const WithPdfLink: Story = {
  args: {
    open: true,
    title: 'Watershed Atlas',
    markdown: `The Watershed Atlas compiles hydrologic data from multiple state and federal sources.

Key references:

- [Methodology PDF](https://example.com/methodology.pdf)
- [Data sources](https://example.com/sources)
- [Contact the team](https://example.com/contact)

Data is updated quarterly.`,
  },
};

export const LongContent: Story = {
  args: {
    open: true,
    title: 'Full documentation',
    markdown: `# Overview

This atlas combines OGC API Features with vector tiles served from tipg to produce an interactive browser for geospatial data.

## Data sources

The data comes from several providers:

1. USGS National Hydrography Dataset
2. EPA Water Quality Portal
3. State Department of Environmental Quality
4. Local watershed councils

### Update frequency

| Source | Frequency | Last refresh |
| ------ | --------- | ------------ |
| USGS NHD | Quarterly | 2026-01-15 |
| EPA WQP | Weekly | 2026-04-01 |
| DEQ | Monthly | 2026-03-28 |
| Local | Ad-hoc | varies |

## Using the map

Click a feature to see its attributes. Use the **Search** panel in the upper right to filter layers by attribute. For bulk data access, use the **Export** button.

> Tip: You can share the current map view by copying the URL — all filters, zoom and center are encoded in the query string.

## Code example

If you want to call the underlying OGC API directly:

\`\`\`bash
curl "https://example.com/collections/rivers/items?limit=10&f=json"
\`\`\`

## Citation

Please cite the atlas as:

    Smith, J. et al. (2026). Watershed Atlas. https://example.com/atlas

---

Questions? [Contact us](https://example.com/contact).`,
  },
};

export const Closed: Story = {
  args: {
    open: false,
    title: 'About this map',
    markdown: 'You should not see this — the modal is closed.',
  },
};
