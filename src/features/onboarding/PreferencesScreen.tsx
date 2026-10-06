import { Header, Screen, EmptyState } from '../../components/ui';

export function PreferencesScreen() {
  return (
    <Screen>
      <Header title="Chọn sở thích" />
      <EmptyState title="Chọn sở thích" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
