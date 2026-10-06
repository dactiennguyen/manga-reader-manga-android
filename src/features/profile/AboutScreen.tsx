import { Header, Screen, EmptyState } from '../../components/ui';

export function AboutScreen() {
  return (
    <Screen>
      <Header title="Giới thiệu" />
      <EmptyState title="Giới thiệu" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
