import { Sheet } from '../../components/Sheet';
import { NovelSettingsForm } from './NovelSettingsForm';

export function NovelSettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Cài đặt đọc">
      <NovelSettingsForm />
    </Sheet>
  );
}
