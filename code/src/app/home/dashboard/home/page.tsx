import { ReactNode } from 'react';

export const metadata = {
  title: 'Home | Naberza OS',
  description: 'Monitor home automation events and status from Home Assistant',
};

export default function HomePage(): ReactNode {
  return (
    <div className="page-container">
      <h1>Home</h1>
      <p>Monitor home automation events and status from Home Assistant</p>
    </div>
  );
}
