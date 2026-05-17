import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, radius } from '@/theme';

interface Props {
  value: string;
  length?: number;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
}

export function OtpInput({ value, length = 6, onChange, onComplete }: Props) {
  const ref = useRef<TextInput | null>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  return (
    <View style={styles.wrap}>
      {Array.from({ length }).map((_, i) => {
        const ch = value[i] ?? '';
        const isCursor = focused && i === value.length;
        return (
          <View
            key={i}
            style={[
              styles.box,
              ch ? styles.boxFilled : null,
              isCursor ? styles.boxCursor : null,
            ]}
            onTouchEnd={() => ref.current?.focus()}
          >
            {ch ? <Text style={styles.digit}>{ch}</Text> : null}
            {!ch && isCursor ? <Text style={styles.cursor}>|</Text> : null}
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        autoFocus
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
        maxLength={length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 10, justifyContent: 'center', position: 'relative' },
  box: {
    width: 50,
    height: 60,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { backgroundColor: '#fff', borderColor: colors.navy },
  boxCursor: { borderColor: colors.blue, borderWidth: 2 },
  digit:  { fontSize: 24, fontWeight: '700', color: colors.text },
  cursor: { fontSize: 24, fontWeight: '300', color: colors.blue },
  hidden: { position: 'absolute', opacity: 0, left: 0, right: 0, top: 0, bottom: 0 },
});
