import { ReactNode } from 'react';
import IdeasView from '.';

export const metadata = {
  title: 'Ideas | Naberza OS',
  description: 'Capture and manage ideas',
};

export default function IdeasViewLayout(): ReactNode {
  return <IdeasView />;
}
