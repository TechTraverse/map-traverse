import type { Meta, StoryObj } from '@storybook/react';
import { LuSettings, LuUser } from 'react-icons/lu';
import { UserMenu } from './UserMenu';
import type { UserMenuProps } from './UserMenu';

const meta: Meta<UserMenuProps> = {
  title: 'Components/UserMenu',
  component: UserMenu,
  parameters: {
    docs: {
      description: {
        component:
          'A user icon button that opens a dropdown menu with user info and actions like logout.',
      },
    },
  },
  args: {
    username: 'admin',
  },
  argTypes: {
    onLogout: { action: 'logout' },
  },
  decorators: [
    (Story) => (
      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', color: 'white' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<UserMenuProps>;

/** Default — username and logout only. */
export const Default: Story = {};

/** With additional menu items. */
export const WithMenuItems: Story = {
  args: {
    menuItems: [
      { label: 'Profile', icon: LuUser, onClick: () => {} },
      { label: 'Settings', icon: LuSettings, onClick: () => {} },
    ],
  },
};

/** Without a username displayed. */
export const NoUsername: Story = {
  args: {
    username: undefined,
  },
};
