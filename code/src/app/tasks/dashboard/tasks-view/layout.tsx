import { ReactNode } from 'react';
import { TasksView } from '.';

export const metadata = {
  title: 'Tasks | Naberza OS',
  description: 'View and manage your tasks',
};

export default function TasksViewLayout(): ReactNode {
  return <TasksView />;
}
