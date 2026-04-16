import { ReactNode } from 'react';
import { SettingsView } from '.';

export const metadata = {
  title: 'Settings | Naberza OS',
  description: 'Manage user preferences and settings',
};

export default function SettingsViewLayout(): ReactNode {
  return <SettingsView />;
}
