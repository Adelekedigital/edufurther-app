import type { Metadata } from 'next';
import { IntegrationsScreen } from './_components/IntegrationsScreen';

export const metadata: Metadata = {
  title: 'Integrations',
  description: 'Connect the tools your sessions run on.',
};

export default function IntegrationsPage() {
  return <IntegrationsScreen />;
}
