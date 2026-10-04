import { Sheet } from '../../components/Sheet';
import { Radio } from '../../components/ui';
import { SITE_LANGUAGES } from '../../sources';

/** Chọn một ngôn ngữ trong 15 ngôn ngữ site được hỗ trợ. */
export function LanguageSheet({
  visible,
  onClose,
  value,
  onSelect,
  title = 'Chọn ngôn ngữ',
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onSelect: (code: string) => void;
  title?: string;
}) {
  const known = SITE_LANGUAGES.some(l => l.code === value);
  const pick = (code: string) => {
    onSelect(code);
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {!known && !!value && <Radio selected label={value} description="Mã ngôn ngữ hiện tại" onPress={onClose} />}
      {SITE_LANGUAGES.map(lang => (
        <Radio
          key={lang.code}
          selected={lang.code === value}
          label={lang.name}
          description={lang.code}
          onPress={() => pick(lang.code)}
        />
      ))}
    </Sheet>
  );
}
