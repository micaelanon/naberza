import { ReactNode } from 'react';
import { IntegrationsView } from '.';

export const metadata = {
  title: 'Integrations | Naberza OS',
  description: 'Manage external integrations',
};

export default function IntegrationsViewLayout(): ReactNode {
  return <IntegrationsView />;
}
