import { useState } from 'react';

import { Sheet } from '../../components/Sheet';
import type { LucideIcon } from '../../components/icons';
import { ListItem, Radio } from '../../components/ui';

export type Option<T extends string | number> = { value: T; label: string; description?: string };

/** Bottom sheet chọn một giá trị (Radio), đóng ngay khi chọn. */
export function OptionSheet<T extends string | number>({
  visible,
  onClose,
  title,
  subtitle,
  options,
  value,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: readonly Option<T>[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      {options.map(option => (
        <Radio
          key={String(option.value)}
          label={option.label}
          description={option.description}
          selected={option.value === value}
          onPress={() => {
            onClose();
            if (option.value !== value) {
              onSelect(option.value);
            }
          }}
        />
      ))}
    </Sheet>
  );
}

/** Dòng cài đặt hiện giá trị đang chọn, bấm mở OptionSheet. */
export function SelectRow<T extends string | number>({
  title,
  icon,
  sheetTitle,
  sheetSubtitle,
  options,
  value,
  onChange,
}: {
  title: string;
  icon?: LucideIcon;
  /** Tiêu đề sheet, mặc định giống tiêu đề dòng. */
  sheetTitle?: string;
  sheetSubtitle?: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  return (
    <>
      <ListItem
        title={title}
        subtitle={current?.label}
        icon={icon}
        chevron
        onPress={() => setOpen(true)}
      />
      <OptionSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? title}
        subtitle={sheetSubtitle}
        options={options}
        value={value}
        onSelect={onChange}
      />
    </>
  );
}
