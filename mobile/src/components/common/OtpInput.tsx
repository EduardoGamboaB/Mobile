import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useColors, radius } from '@/theme';

interface Props {
  value: string;
  length?: number;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
}

export function OtpInput({ value, length = 6, onChange, onComplete }: Props) {
  const ref = useRef<TextInput | null>(null);
  const [focused, setFocused] = useState(false);
  const c = useColors();

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
              {
                backgroundColor: ch ? c.bg : c.surface,
                borderColor: isCursor ? c.blue : ch ? c.text : c.border,
                borderWidth: isCursor ? 2 : 1,
              },
            ]}
            onTouchEnd={() => ref.current?.focus()}
          >
            {ch ? <Text style={[styles.digit, { color: c.text }]}>{ch}</Text> : null}
            {!ch && isCursor ? <Text style={[styles.cursor, { color: c.blue }]}>|</Text> : null}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit:  { fontSize: 24, fontWeight: '700' },
  cursor: { fontSize: 24, fontWeight: '300' },
  hidden: { position: 'absolute', opacity: 0, left: 0, right: 0, top: 0, bottom: 0 },
});
