import { Header, Screen, EmptyState } from '../../components/ui';

export function CharacterScreen() {
  return (
    <Screen>
      <Header title="Nhân vật" />
      <EmptyState title="Nhân vật" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
