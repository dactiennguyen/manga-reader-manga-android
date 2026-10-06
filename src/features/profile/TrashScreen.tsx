import { Header, Screen, EmptyState } from '../../components/ui';

export function TrashScreen() {
  return (
    <Screen>
      <Header title="Thùng rác" />
      <EmptyState title="Thùng rác" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
