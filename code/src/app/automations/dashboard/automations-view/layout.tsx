import { ReactNode } from 'react';
import AutomationsView from '.';

export const metadata = {
  title: 'Automations | Naberza OS',
  description: 'Configure and manage automations',
};

const AutomationsViewLayout = (): ReactNode  => {
  return <AutomationsView />;
}

export default AutomationsViewLayout;
