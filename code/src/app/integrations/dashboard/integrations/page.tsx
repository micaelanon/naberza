import { ReactNode } from 'react';

export const metadata = {
  title: 'Integrations | Naberza OS',
  description: 'Manage Paperless-ngx, Home Assistant, Mail, and Notification integrations',
};

export default function IntegrationsPage(): ReactNode {
  return (
    <div className="page-container">
      <h1>Integrations</h1>
      <p>Manage Paperless-ngx, Home Assistant, Mail, and Notification integrations</p>
    </div>
  );
}
