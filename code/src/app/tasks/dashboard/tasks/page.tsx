import { ReactNode } from 'react';

export const metadata = {
  title: 'Tasks | Naberza OS',
  description: 'View and manage your tasks (today, upcoming, persistent, completed)',
};

export default function TasksPage(): ReactNode {
  return (
    <div className="page-container">
      <h1>Tasks</h1>
      <p>View and manage your tasks (today, upcoming, persistent, completed)</p>
    </div>
  );
}
