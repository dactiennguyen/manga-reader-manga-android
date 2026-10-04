import { Sheet } from '../../components/Sheet';
import { NovelSettingsForm } from './NovelSettingsForm';

/** Sheet "Aa" trong reader novel — đổi ngay trên trang đang đọc. */
export function NovelSettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Cài đặt đọc">
      <NovelSettingsForm />
    </Sheet>
  );
}
