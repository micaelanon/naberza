import { ReactNode } from 'react';
import TasksView from '.';

export const metadata = {
  title: 'Tasks | Naberza OS',
  description: 'View and manage your tasks',
};

const TasksViewLayout = (): ReactNode  => {
  return <TasksView />;
}

export default TasksViewLayout;
