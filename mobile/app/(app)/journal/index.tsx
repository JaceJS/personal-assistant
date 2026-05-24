import { BookOpen } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import EmptyState from '@/components/ui/EmptyState';

export default function JournalScreen() {
  return (
    <Screen>
      <Header title="Journal" />
      <EmptyState
        icon={BookOpen}
        title="Your thoughts, captured by voice."
        subtitle="Coming soon"
      />
    </Screen>
  );
}
