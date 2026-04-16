import { ReactNode } from 'react';

export const metadata = {
  title: 'Ideas | Naberza OS',
  description: 'Capture, tag, and manage ideas for future development',
};

export default function IdeasPage(): ReactNode {
  return (
    <div className="page-container">
      <h1>Ideas</h1>
      <p>Capture, tag, and manage ideas for future development</p>
    </div>
  );
}
