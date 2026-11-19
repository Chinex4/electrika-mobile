import { Pressable, Text, View } from 'react-native';

import { cx } from '@/components/ui';
import { useLanguage, type Lang } from '@/i18n';

const CHOICES: { lang: Lang; label: string }[] = [
  { lang: 'en', label: 'English' },
  { lang: 'ig', label: 'Igbo' },
];

/** English | Igbo. Saved on the phone, and on the account when signed in. */
export function LanguageSwitch() {
  const { lang, setLang } = useLanguage();
  return (
    <View className="flex-row self-center rounded-full bg-[#E8EDF4] p-1" accessibilityRole="radiogroup">
      {CHOICES.map((c) => {
        const on = c.lang === lang;
        return (
          <Pressable
            key={c.lang}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => on || setLang(c.lang)}
            className={cx('rounded-full px-5 py-2', on && 'bg-white shadow-sm')}>
            <Text className={cx('text-sm font-semibold', on ? 'text-brand' : 'text-muted')}>{c.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
