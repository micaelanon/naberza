import { ReactNode } from 'react';
import InvoicesView from '.';

export const metadata = {
  title: 'Invoices | Naberza OS',
  description: 'Track and manage invoices',
};

const InvoicesViewLayout = (): ReactNode  => {
  return <InvoicesView />;
}

export default InvoicesViewLayout;
