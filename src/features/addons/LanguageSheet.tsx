import { Sheet } from '../../components/Sheet';
import { Radio } from '../../components/ui';
import { languageName, SITE_LANGUAGES } from '../../sources';

/** Chọn một ngôn ngữ trong các ngôn ngữ site được hỗ trợ. */
export function LanguageSheet({
  visible,
  onClose,
  value,
  onSelect,
  title = 'Chọn ngôn ngữ',
  codes,
  allLabel,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onSelect: (code: string) => void;
  title?: string;
  /** Chỉ liệt kê các mã này; mặc định là mọi ngôn ngữ site được hỗ trợ. */
  codes?: string[];
  /** Thêm lựa chọn "tất cả" ở đầu danh sách; chọn nó trả về ''. */
  allLabel?: string;
}) {
  const options = codes ?? SITE_LANGUAGES.map(l => l.code);
  const known = !value || options.includes(value);
  const pick = (code: string) => {
    onSelect(code);
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {!!allLabel && <Radio selected={!value} label={allLabel} onPress={() => pick('')} />}
      {!known && <Radio selected label={value} description="Mã ngôn ngữ hiện tại" onPress={onClose} />}
      {options.map(code => (
        <Radio
          key={code}
          selected={code === value}
          label={languageName(code)}
          description={code}
          onPress={() => pick(code)}
        />
      ))}
    </Sheet>
  );
}
