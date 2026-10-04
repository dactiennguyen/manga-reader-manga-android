import { StyleSheet, Text, View } from 'react-native';

import { Dialog } from '../../components/Sheet';
import { ShieldAlert } from '../../components/icons';
import { useSettings } from '../../store/useSettings';
import { font, useTheme } from '../../theme';

/**
 * Xác nhận đủ tuổi trước khi bật nội dung 18+ (AdultContentDialog,
 * CONFIRM_AGE18). Xác nhận thì lưu ageConfirmed và bật showNsfw luôn.
 */
export function AdultContentDialog({
  visible,
  onClose,
  onConfirmed,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirmed?: () => void;
}) {
  const { c } = useTheme();
  const set = useSettings(s => s.set);

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      actions={[
        { label: 'Tôi chưa đủ 18 tuổi', variant: 'secondary', onPress: onClose },
        {
          label: 'Tôi đủ 18 tuổi',
          variant: 'primary',
          onPress: () => {
            set({ ageConfirmed: true, showNsfw: true });
            onClose();
            onConfirmed?.();
          },
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: c.dangerSoft }]}>
        <ShieldAlert size={26} color={c.danger} />
      </View>
      <Text style={[font.heading, { color: c.text }]}>Nội dung nhạy cảm</Text>
      <Text style={[font.body, { color: c.textSecondary }]}>
        Khi tiếp tục, bạn xác nhận mình đủ 18 tuổi hoặc đủ tuổi trưởng thành theo luật nơi bạn sống.
      </Text>
      <Text style={[font.caption, { color: c.muted }]}>
        Nếu bạn chưa đủ 18 tuổi, vui lòng rời khỏi phần này. Bạn có thể tắt nội dung 18+ bất cứ lúc
        nào trong Cài đặt.
      </Text>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
