import { ReactNode } from 'react';
import InvoicesView from '.';

export const metadata = {
  title: 'Invoices | Naberza OS',
  description: 'Track and manage invoices',
};

export default function InvoicesViewLayout(): ReactNode {
  return <InvoicesView />;
}
