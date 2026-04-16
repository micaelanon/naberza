import { ReactNode } from 'react';

export const metadata = {
  title: 'Inbox | Naberza OS',
  description: 'Manage incoming items and messages',
};

export default function InboxPage(): ReactNode {
  return (
    <div className="page-container">
      <h1>Inbox</h1>
      <p>Manage incoming items and messages</p>
    </div>
  );
}
