import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BookOpen, Globe, Lock, Puzzle, Scale, Type } from '../../components/icons';
import { Divider, Header, ListItem, Screen, Section } from '../../components/ui';
import { font, radius, space, useTheme } from '../../theme';
import packageJson from '../../../package.json';

const FONTS = ['Bellota', 'Charm', 'Lato', 'Merriweather', 'Patrick Hand', 'Quicksand'];

const LIBRARIES: { name: string; license: string }[] = [
  { name: 'React Native', license: 'MIT' },
  { name: 'React Navigation', license: 'MIT' },
  { name: 'react-native-webview', license: 'MIT' },
  { name: 'Zustand', license: 'MIT' },
  { name: 'react-native-mmkv', license: 'MIT' },
  { name: 'FlashList', license: 'MIT' },
  { name: 'cheerio', license: 'MIT' },
  { name: 'Lucide Icons', license: 'ISC' },
  { name: '@dr.pogodin/react-native-fs', license: 'MIT' },
  { name: '@react-native-documents/picker', license: 'MIT' },
  { name: 'react-native-cookie-manager', license: 'MIT' },
  { name: 'react-native-speech', license: 'MIT' },
  { name: 'react-native-camera-kit', license: 'MIT' },
];

export function AboutScreen() {
  const { c } = useTheme();
  return (
    <Screen>
      <Header title="Giới thiệu" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: c.primaryContainer }]}>
            <BookOpen size={36} color={c.onPrimaryContainer} />
          </View>
          <Text style={[font.title, { color: c.text }]}>Manga Reader</Text>
          <Text style={[font.caption, { color: c.muted }]}>Phiên bản {packageJson.version}</Text>
        </View>

        <Section title="Cách app hoạt động">
          <Paragraph icon={<Globe size={20} color={c.accent} />}>
            App là một trình duyệt web. Bạn mở bất kỳ trang truyện nào như trên trình duyệt thông
            thường.
          </Paragraph>
          <Divider inset={52} />
          <Paragraph icon={<Puzzle size={20} color={c.accent} />}>
            Với các site đã thêm vào addon, addon đọc nội dung của chính trang đó (danh sách truyện,
            chương, ảnh) rồi hiển thị lại bằng giao diện native gọn gàng, có bookmark, lịch sử, tải
            chương và thống kê đọc.
          </Paragraph>
        </Section>

        <Section title="Nội dung">
          <Paragraph>
            App không sở hữu, không lưu trữ và không phân phối nội dung truyện. Mọi nội dung thuộc về
            site nguồn và chủ sở hữu bản quyền; app chỉ hiển thị những gì site đó công khai trên web.
            Hãy ủng hộ tác giả và nhà phát hành chính thức khi có thể.
          </Paragraph>
        </Section>

        <Section title="Quyền riêng tư">
          <Paragraph icon={<Lock size={20} color={c.success} />}>
            App không có quảng cáo, không dùng analytics hay theo dõi người dùng. Bookmark, lịch sử,
            cài đặt và chương đã tải chỉ được lưu trên máy của bạn — dùng Sao lưu & khôi phục để
            chuyển sang máy khác.
          </Paragraph>
        </Section>

        <Section
          title="Giấy phép phông chữ"
          footer="Toàn văn giấy phép nằm trong file FONT-LICENSES.txt cùng thư mục phông chữ của app."
        >
          <ListItem
            title={FONTS.join(', ')}
            subtitle="SIL Open Font License 1.1 — dùng trong trình đọc tiểu thuyết"
            icon={Type}
            titleLines={2}
          />
        </Section>

        <Section title="Thư viện mã nguồn mở">
          {LIBRARIES.map((lib, index) => (
            <View key={lib.name}>
              {index > 0 && <Divider inset={52} />}
              <ListItem
                title={lib.name}
                icon={Scale}
                right={<Text style={[font.caption, { color: c.muted }]}>{lib.license}</Text>}
              />
            </View>
          ))}
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Paragraph({ icon, children }: { icon?: ReactNode; children: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.paragraph}>
      {icon}
      <Text style={[font.body, styles.paragraphText, { color: c.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: space.lg, gap: space.xl },
  hero: { alignItems: 'center', gap: space.xs, paddingVertical: space.md },
  logo: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  paragraph: { flexDirection: 'row', gap: space.md + 2, padding: space.lg },
  paragraphText: { flex: 1, lineHeight: 22 },
});
