import { ReactNode } from 'react';
import AuditView from '.';

export const metadata = {
  title: 'Audit | Naberza OS',
  description: 'View system audit log',
};

const AuditViewLayout = (): ReactNode  => {
  return <AuditView />;
}

export default AuditViewLayout;
