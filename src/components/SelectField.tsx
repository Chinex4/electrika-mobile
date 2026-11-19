import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { brandColors, cx, Field, Icon, icons, Sheet } from '@/components/ui';
import { useT } from '@/i18n';

/** A field that opens a searchable list in a sheet: areas, sites, products. */
export function SelectField<K extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
  searchable = true,
}: {
  label: string;
  value: K | null | undefined;
  options: { key: K; label: string; sub?: string }[];
  onChange: (key: K) => void;
  placeholder?: string;
  error?: string;
  searchable?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const chosen = options.find((o) => o.key === value);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? options.filter((o) => `${o.label} ${o.sub ?? ''}`.toLowerCase().includes(term)) : options;
  }, [q, options]);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-navy">{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        className={cx('min-h-[52px] flex-row items-center gap-2 rounded-2xl border-[1.5px] bg-white px-4 active:opacity-80', error ? 'border-alert' : 'border-edge')}>
        <Text className={cx('flex-1 text-base', chosen ? 'text-navy' : 'text-faint')} numberOfLines={1}>
          {chosen?.label ?? placeholder ?? t('common.choose')}
        </Text>
        <Icon name={{ sf: 'chevron.up.chevron.down', md: 'unfold_more' }} size={14} color={brandColors.faint} />
      </Pressable>
      {error ? <Text className="text-sm text-alert-ink">{error}</Text> : null}
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        {searchable && options.length > 8 ? (
          <Field label={t('common.search')} placeholder={t('ph.common.search')} icon={icons.search} value={q} onChangeText={setQ} autoCorrect={false} />
        ) : null}
        <View className="overflow-hidden rounded-2xl border border-line bg-white">
          {shown.map((o, i) => (
            <Pressable
              key={String(o.key)}
              onPress={() => {
                onChange(o.key);
                setOpen(false);
                setQ('');
              }}
              className={cx('flex-row items-center gap-3 px-4 py-3.5 active:bg-mist', i < shown.length - 1 && 'border-b border-line/70')}>
              <View className="flex-1">
                <Text className={cx('text-[15px]', o.key === value ? 'font-semibold text-brand' : 'text-navy')}>{o.label}</Text>
                {o.sub ? <Text className="text-[13px] text-muted">{o.sub}</Text> : null}
              </View>
              {o.key === value ? <Icon name={{ sf: 'checkmark', md: 'check' }} size={16} /> : null}
            </Pressable>
          ))}
          {!shown.length ? <Text className="p-4 text-center text-muted">{t('common.noMatch')}</Text> : null}
        </View>
      </Sheet>
    </View>
  );
}
