import { Header, Screen, EmptyState } from '../../components/ui';

export function WorldEntryScreen() {
  return (
    <Screen>
      <Header title="Mục thế giới" />
      <EmptyState title="Mục thế giới" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
