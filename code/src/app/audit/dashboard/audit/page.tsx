import { ReactNode } from 'react';

export const metadata = {
  title: 'Audit | Naberza OS',
  description: 'View immutable audit trail of all system events and changes',
};

export default function AuditPage(): ReactNode {
  return (
    <div className="page-container">
      <h1>Audit</h1>
      <p>View immutable audit trail of all system events and changes</p>
    </div>
  );
}
