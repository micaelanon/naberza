import { ReactNode } from 'react';

export const metadata = {
  title: 'Settings | Naberza OS',
  description: 'Manage user preferences, notification settings, and profile',
};

export default function UsersPage(): ReactNode {
  return (
    <div className="page-container">
      <h1>Settings</h1>
      <p>Manage user preferences, notification settings, and profile</p>
    </div>
  );
}
