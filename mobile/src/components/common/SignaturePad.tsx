import React, { useRef, useState } from 'react';
import { View, Text, PanResponder, StyleSheet, GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColors, radius, spacing } from '@/theme';

interface Props {
  height?: number;
  onChange?: (hasContent: boolean) => void;
}

export interface SignaturePadHandle {
  clear: () => void;
}

export const SignaturePad = React.forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { height = 200, onChange },
  ref,
) {
  const c = useColors();
  const [paths, setPaths] = useState<string[]>([]);
  const current = useRef('');

  const xy = (e: GestureResponderEvent) =>
    `${e.nativeEvent.locationX.toFixed(1)},${e.nativeEvent.locationY.toFixed(1)}`;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        current.current = `M${xy(e)}`;
      },
      onPanResponderMove: (e) => {
        current.current += ` L${xy(e)}`;
        setPaths((prev) => {
          const next = [...prev];
          next[next.length - 1] = current.current;
          return next;
        });
      },
      onPanResponderStart: () => {
        setPaths((prev) => [...prev, current.current || '']);
      },
      onPanResponderRelease: () => {
        onChange?.(true);
      },
    }),
  ).current;

  React.useImperativeHandle(ref, () => ({
    clear: () => {
      setPaths([]);
      current.current = '';
      onChange?.(false);
    },
  }));

  return (
    <View
      style={[
        styles.pad,
        {
          height,
          backgroundColor: c.surface,
          borderColor: c.border,
        },
      ]}
      {...responder.panHandlers}
    >
      <Svg style={StyleSheet.absoluteFill}>
        {paths.map((d, i) => (
          <Path key={i} d={d} stroke={c.text} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Svg>
      {paths.length === 0 ? (
        <Text style={[styles.placeholder, { color: c.muted }]}>— FIRMA AQUÍ —</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  pad: {
    borderRadius: radius.button,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    position: 'absolute',
    bottom: spacing.md,
    fontSize: 11,
    letterSpacing: 1,
  },
});
