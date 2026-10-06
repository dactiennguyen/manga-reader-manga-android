import { toast } from '../../components/ui';
import { useLibrary } from '../../store/useLibrary';
import { checkLibraryUpdates, useUpdateCheck } from './updates';

export async function runLibraryUpdateCheck(keys?: string[]): Promise<void> {
  if (useUpdateCheck.getState().running) {
    toast('Đang kiểm tra cập nhật, vui lòng chờ…');
    return;
  }
  const count = keys?.length ?? Object.keys(useLibrary.getState().bookmarks).length;
  if (!count) {
    toast('Chưa có truyện nào để kiểm tra');
    return;
  }
  await checkLibraryUpdates(keys);
  const result = useUpdateCheck.getState().lastResult;
  if (!result) {
    return;
  }
  const parts = [
    result.newChapters > 0
      ? `Có ${result.newChapters} chương mới ở ${result.updated} truyện`
      : 'Không có chương mới',
  ];
  if (result.failed > 0) {
    parts.push(`${result.failed} truyện không kiểm tra được`);
  }
  toast(parts.join(' · '));
}
