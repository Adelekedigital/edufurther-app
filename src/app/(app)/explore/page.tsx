import type { Metadata } from 'next';
import { ExploreScreen } from './_components/ExploreScreen';

export const metadata: Metadata = {
  title: 'Find a mentor',
  description: 'Find a mentor who has been through the study-abroad journey.',
};

export default function ExplorePage() {
  return <ExploreScreen />;
}
