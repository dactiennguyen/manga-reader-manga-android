import { useState } from 'react';
import { FlatList, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { File, Film, FolderOpen, Image as ImageIcon, Music, RotateCw, Trash2, X } from '../../components/icons';
import { Dialog } from '../../components/Sheet';
import { Checkbox, EmptyState, IconButton, ProgressBar, toast } from '../../components/ui';
import { formatBytes } from '../../lib/format';
import { formatRelative } from '../../lib/time';
import { displayUrl } from '../../lib/url';
import { useFiles, type FileDownload, type FileKind } from '../../store/useFiles';
import { font, radius, space, useTheme } from '../../theme';
import { removeFileDownloads, retryFileDownload } from './fileDownloader';

const KIND_ICON: Record<FileKind, typeof File> = { image: ImageIcon, video: Film, audio: Music, file: File };

/** Mở ứng dụng Tải xuống của máy — nơi xem/chia sẻ video và tệp đã tải. */
function openSystemDownloads() {
  Linking.sendIntent('android.intent.action.VIEW_DOWNLOADS').catch(() =>
    toast('Mở ứng dụng Files/Tải xuống của máy để xem tệp trong thư mục Download'),
  );
}

/** "Files & Media": ảnh, video, tệp tải từ trình duyệt. */
export function FileDownloads() {
  const { c } = useTheme();
  const files = useFiles(s => s.files);
  const [preview, setPreview] = useState<FileDownload | null>(null);
  const [removing, setRemoving] = useState<FileDownload | null>(null);
  const [deleteFile, setDeleteFile] = useState(true);

  const open = (file: FileDownload) => {
    if (file.status === 'error') {
      retryFileDownload(file.id);
      return;
    }
    if (file.status !== 'done') {
      toast('Tệp đang tải…');
      return;
    }
    if (file.kind === 'image') {
      setPreview(file);
    } else {
      openSystemDownloads();
    }
  };

  const askRemove = (file: FileDownload) => {
    setDeleteFile(true);
    setRemoving(file);
  };

  if (!files.length) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Chưa có tệp nào"
        message="Nhấn giữ ảnh hoặc link trong trang để tải, hoặc chọn “Tải video trên trang” trong menu trình duyệt. Tệp được lưu vào thư mục Download của máy."
      />
    );
  }

  return (
    <>
      <FlatList
        data={files}
        keyExtractor={file => file.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: file }) => {
          const Icon = KIND_ICON[file.kind];
          const progress = file.total ? file.bytes / file.total : 0;
          return (
            <Pressable
              onPress={() => open(file)}
              onLongPress={() => askRemove(file)}
              android_ripple={{ color: c.border }}
              style={styles.row}
            >
              <View style={[styles.thumb, { backgroundColor: c.surfaceAlt }]}>
                {file.kind === 'image' && file.status === 'done' ? (
                  <Image source={{ uri: `file://${file.path}` }} style={styles.thumbImage} resizeMode="cover" />
                ) : (
                  <Icon size={24} color={c.muted} />
                )}
              </View>
              <View style={styles.body}>
                <Text numberOfLines={1} style={[styles.name, { color: c.text }]}>
                  {file.name}
                </Text>
                {file.status === 'downloading' ? (
                  <>
                    <ProgressBar value={progress} />
                    <Text style={[font.caption, { color: c.muted }]}>
                      {file.total ? `${formatBytes(file.bytes)} / ${formatBytes(file.total)}` : formatBytes(file.bytes)}
                    </Text>
                  </>
                ) : file.status === 'error' ? (
                  <Text numberOfLines={2} style={[font.caption, { color: c.danger }]}>
                    {file.error ?? 'Tải lỗi'} · nhấn để thử lại
                  </Text>
                ) : (
                  <Text numberOfLines={1} style={[font.caption, { color: c.muted }]}>
                    {formatBytes(file.bytes)} · {formatRelative(file.createdAt)}
                    {file.pageUrl ? ` · ${displayUrl(file.pageUrl)}` : ''}
                  </Text>
                )}
              </View>
              {file.status === 'error' ? (
                <IconButton
                  icon={RotateCw}
                  size={18}
                  color={c.muted}
                  onPress={() => retryFileDownload(file.id)}
                  accessibilityLabel="Tải lại"
                />
              ) : (
                <IconButton
                  icon={Trash2}
                  size={18}
                  color={c.muted}
                  onPress={() => askRemove(file)}
                  accessibilityLabel="Xoá"
                />
              )}
            </Pressable>
          );
        }}
      />

      <Dialog
        visible={!!removing}
        onClose={() => setRemoving(null)}
        title="Xoá tệp"
        message={removing ? `Xoá “${removing.name}” khỏi danh sách?` : undefined}
        actions={[
          { label: 'Huỷ', variant: 'ghost', onPress: () => setRemoving(null) },
          {
            label: 'Xoá',
            variant: 'danger',
            onPress: () => {
              const target = removing;
              setRemoving(null);
              if (target) {
                removeFileDownloads([target.id], deleteFile).then(() => toast('Đã xoá'));
              }
            },
          },
        ]}
      >
        {removing?.status === 'done' && (
          <Checkbox checked={deleteFile} onChange={setDeleteFile} label="Xoá cả tệp trong thư mục Download" />
        )}
      </Dialog>

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.preview}>
          {preview && (
            <Image source={{ uri: `file://${preview.path}` }} style={styles.previewImage} resizeMode="contain" />
          )}
          <View style={styles.previewBar}>
            <IconButton icon={FolderOpen} color="#fff" onPress={openSystemDownloads} accessibilityLabel="Mở thư mục" />
            <IconButton icon={X} color="#fff" onPress={() => setPreview(null)} accessibilityLabel="Đóng" />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: space.xs, paddingBottom: space.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.sm,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: 48, height: 48 },
  body: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontWeight: '600' },
  preview: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  previewImage: { width: '100%', height: '100%' },
  previewBar: { position: 'absolute', top: space.xl, right: space.sm, flexDirection: 'row' },
});
