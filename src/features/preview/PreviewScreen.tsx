import { Header, Screen, EmptyState } from '../../components/ui';

export function PreviewScreen() {
  return (
    <Screen>
      <Header title="Đọc thử" />
      <EmptyState title="Đọc thử" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
