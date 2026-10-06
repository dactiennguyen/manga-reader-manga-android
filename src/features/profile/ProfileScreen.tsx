import { Header, Screen, EmptyState } from '../../components/ui';

export function ProfileScreen() {
  return (
    <Screen>
      <Header title="Hồ sơ" />
      <EmptyState title="Hồ sơ" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
