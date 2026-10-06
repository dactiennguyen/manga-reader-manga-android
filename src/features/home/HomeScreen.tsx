import { Header, Screen, EmptyState } from '../../components/ui';

export function HomeScreen() {
  return (
    <Screen>
      <Header title="Trang chủ" />
      <EmptyState title="Trang chủ" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
