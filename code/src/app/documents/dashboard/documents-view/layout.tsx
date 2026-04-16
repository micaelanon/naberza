import { ReactNode } from 'react';
import { DocumentsView } from '.';

export const metadata = {
  title: 'Documents | Naberza OS',
  description: 'Browse and manage documents',
};

export default function DocumentsViewLayout(): ReactNode {
  return <DocumentsView />;
}
