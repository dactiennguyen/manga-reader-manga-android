import { Header, Screen, EmptyState } from '../../components/ui';

export function NewProjectScreen() {
  return (
    <Screen>
      <Header title="Truyện mới" />
      <EmptyState title="Truyện mới" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
