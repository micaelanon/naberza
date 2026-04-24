import { ReactNode } from 'react';
import DocumentsView from '.';

export const metadata = {
  title: 'Documents | Naberza OS',
  description: 'Browse and manage documents',
};

const DocumentsViewLayout = (): ReactNode  => {
  return <DocumentsView />;
}

export default DocumentsViewLayout;
