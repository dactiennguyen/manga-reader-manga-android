import { Header, Screen, EmptyState } from '../../components/ui';

export function LibraryScreen() {
  return (
    <Screen>
      <Header title="Thư viện" />
      <EmptyState title="Thư viện" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
