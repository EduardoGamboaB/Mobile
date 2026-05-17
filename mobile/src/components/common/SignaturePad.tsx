import React, { useRef, useState } from 'react';
import { View, Text, PanResponder, StyleSheet, GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, spacing } from '@/theme';

interface Props {
  height?: number;
  /** Notifica cada vez que cambia el contenido del lienzo. */
  onChange?: (hasContent: boolean) => void;
}

/**
 * Captura ligera de firma usando PanResponder + react-native-svg.
 * Devuelve si hay contenido vía `onChange`. Producción puede sustituir por
 * `react-native-signature-canvas` para exportar PNG/SVG con base64.
 */
export interface SignaturePadHandle {
  clear: () => void;
}

export const SignaturePad = React.forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { height = 200, onChange },
  ref,
) {
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
        setPaths((prev) => {
          const next = [...prev, current.current || ''];
          return next;
        });
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
      style={[styles.pad, { height }]}
      {...responder.panHandlers}
    >
      <Svg style={StyleSheet.absoluteFill}>
        {paths.map((d, i) => (
          <Path key={i} d={d} stroke={colors.navy} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Svg>
      {paths.length === 0 ? (
        <Text style={styles.placeholder}>— FIRMA AQUÍ —</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  pad: {
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.muted,
  },
});
