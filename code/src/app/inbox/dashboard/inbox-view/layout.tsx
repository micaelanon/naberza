import { ReactNode } from 'react';
import InboxView from '.';

export const metadata = {
  title: 'Inbox | Naberza OS',
  description: 'Manage incoming items and messages',
};

const InboxViewLayout = (): ReactNode  => {
  return <InboxView />;
}

export default InboxViewLayout;
