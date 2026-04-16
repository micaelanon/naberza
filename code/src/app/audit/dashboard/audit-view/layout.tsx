import { ReactNode } from 'react';
import { AuditView } from '.';

export const metadata = {
  title: 'Audit | Naberza OS',
  description: 'View system audit log',
};

export default function AuditViewLayout(): ReactNode {
  return <AuditView />;
}
