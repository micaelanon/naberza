import { ReactNode } from 'react';
import { InboxView } from '.';

export const metadata = {
  title: 'Inbox | Naberza OS',
  description: 'Manage incoming items and messages',
};

export default function InboxViewLayout(): ReactNode {
  return <InboxView />;
}
