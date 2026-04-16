import { ReactNode } from 'react';

export const metadata = {
  title: 'Documents | Naberza OS',
  description: 'Browse and manage documents from Paperless-ngx integration',
};

export default function DocumentsPage(): ReactNode {
  return (
    <div className="page-container">
      <h1>Documents</h1>
      <p>Browse and manage documents from Paperless-ngx integration</p>
    </div>
  );
}
