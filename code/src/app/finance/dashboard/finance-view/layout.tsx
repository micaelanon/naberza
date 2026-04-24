import { ReactNode } from 'react';
import FinanceView from '.';

export const metadata = {
  title: 'Finance | Naberza OS',
  description: 'View financial tracking and analysis',
};

const FinanceViewLayout = (): ReactNode  => {
  return <FinanceView />;
}

export default FinanceViewLayout;
