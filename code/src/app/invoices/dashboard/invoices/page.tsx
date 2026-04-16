import { ReactNode } from 'react';

export const metadata = {
  title: 'Invoices | Naberza OS',
  description: 'Track and manage invoices (pending, paid, overdue)',
};

export default function InvoicesPage(): ReactNode {
  return (
    <div className="page-container">
      <h1>Invoices</h1>
      <p>Track and manage invoices (pending, paid, overdue)</p>
    </div>
  );
}
