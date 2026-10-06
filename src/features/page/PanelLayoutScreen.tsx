import { Header, Screen, EmptyState } from '../../components/ui';

export function PanelLayoutScreen() {
  return (
    <Screen>
      <Header title="Dàn khung trang" />
      <EmptyState title="Dàn khung trang" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
