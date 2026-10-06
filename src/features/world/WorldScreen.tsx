import { Header, Screen, EmptyState } from '../../components/ui';

export function WorldScreen() {
  return (
    <Screen>
      <Header title="Thế giới" />
      <EmptyState title="Thế giới" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
