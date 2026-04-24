import { ReactNode } from 'react';
import IntegrationsView from '.';

export const metadata = {
  title: 'Integrations | Naberza OS',
  description: 'Manage external integrations',
};

const IntegrationsViewLayout = (): ReactNode  => {
  return <IntegrationsView />;
}

export default IntegrationsViewLayout;
