import { Header, Screen, EmptyState } from '../../components/ui';

export function SignInScreen() {
  return (
    <Screen>
      <Header title="Đăng nhập" />
      <EmptyState title="Đăng nhập" message="Màn hình đang được xây dựng." />
    </Screen>
  );
}
