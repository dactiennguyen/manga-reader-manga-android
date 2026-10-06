import { Header, Screen, EmptyState } from '../../components/ui';

export function ProjectScreen() {
  return (
    <Screen>
      <Header title="Tổng quan truyện" />
      <EmptyState title="Tổng quan truyện" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
