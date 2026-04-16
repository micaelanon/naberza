import { ReactNode } from 'react';

export const metadata = {
  title: 'Finance | Naberza OS',
  description: 'View financial tracking, recurring charges, and anomaly detection',
};

export default function FinancePage(): ReactNode {
  return (
    <div className="page-container">
      <h1>Finance</h1>
      <p>View financial tracking, recurring charges, and anomaly detection</p>
    </div>
  );
}
