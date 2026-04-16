import { ReactNode } from 'react';
import { AutomationsView } from '.';

export const metadata = {
  title: 'Automations | Naberza OS',
  description: 'Configure and manage automations',
};

export default function AutomationsViewLayout(): ReactNode {
  return <AutomationsView />;
}
