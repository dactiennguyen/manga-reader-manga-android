import { Header, Screen, EmptyState } from '../../components/ui';

export function CanvasScreen() {
  return (
    <Screen>
      <Header title="Canvas vẽ" />
      <EmptyState title="Canvas vẽ" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
