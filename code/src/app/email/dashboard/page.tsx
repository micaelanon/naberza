import { AppShell } from '@/components/ui';
import { EmailDashboardClient } from './email-view';

export default function EmailDashboardPage() {
  return (
    <AppShell title="Correo">
      <EmailDashboardClient />
    </AppShell>
  );
}
