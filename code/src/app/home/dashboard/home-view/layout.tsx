import { ReactNode } from 'react';
import { HomeView } from '.';

export const metadata = {
  title: 'Home | Naberza OS',
  description: 'Monitor home automation and events',
};

export default function HomeViewLayout(): ReactNode {
  return <HomeView />;
}
