import { Header, Screen, EmptyState } from '../../components/ui';

export function WelcomeScreen() {
  return (
    <Screen>
      <Header title="Chào mừng" />
      <EmptyState title="Chào mừng" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
