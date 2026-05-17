import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { IconTile } from '@/components/common/IconTile';
import {
  ChevronLeftIcon,
  PhoneIcon,
  PaperclipIcon,
  SendIcon,
  MicIcon,
  SparklesIcon,
  CheckIcon,
} from '@/components/icons';
import { demoStore } from '@/demo';
import { ai } from '@/services/ai';
import { useFeature } from '@/stores/subscription';
import { Feature } from '@/constants/tiers';
import { useColors, radius, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { DemoChatMessage } from '@/demo/data';
import type { AppNav, AppStackParamList } from '@/navigation/types';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function ChatThreadScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const nav = useNavigation<AppNav<'ChatThread'>>();
  const route = useRoute<RouteProp<AppStackParamList, 'ChatThread'>>();
  const { chatId, title } = route.params;
  const list = useRef<FlatList<DemoChatMessage> | null>(null);
  const [messages, setMessages] = useState<DemoChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const hasAI = useFeature(Feature.AIAssistantChat);

  const refresh = async () => setMessages(await demoStore.listChatMessages(chatId));

  useEffect(() => {
    refresh();
  }, [chatId]);

  const send = async () => {
    if (!draft.trim()) return;
    await demoStore.sendChatMessage(chatId, draft.trim());
    setDraft('');
    refresh();
  };

  const suggestReply = async () => {
    if (!hasAI) {
      nav.navigate('Plans', { highlight: 'pro' });
      return;
    }
    setSuggesting(true);
    const r = await ai.assistantReply({
      history: messages.map((m) => ({
        id: m.id,
        role: m.from === 'me' ? 'user' : 'dispatcher',
        content: m.text,
        createdAt: m.at,
      })),
      tripContext: {
        folio: 'G3-2026-00123',
        status: 'in_transit',
        destination: 'Bodega Pemex, Tampico',
      },
    });
    setSuggesting(false);
    setDraft(r.reply);
  };

  return (
    <Screen padded={false} background="cream">
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()}>
          <IconTile tone="navy">
            <ChevronLeftIcon color={c.navy} />
          </IconTile>
        </Pressable>
        <View style={[styles.avatar, { backgroundColor: c.navy }]}>
          <Text style={styles.avatarText}>{title.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: spacing.sm + 2 }}>
          <Text style={[typography.bodyStrong, { color: c.text }]}>{title}</Text>
          <View style={styles.statusRow}>
            <View style={styles.dot} />
            <Text style={[typography.caption, { color: c.muted }]}>En línea</Text>
          </View>
        </View>
        <IconTile tone="navy">
          <PhoneIcon color={c.navy} />
        </IconTile>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={list}
          contentContainerStyle={{ padding: spacing.lg + 4, paddingBottom: spacing.lg }}
          data={messages}
          keyExtractor={(m) => m.id}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.from === 'me';
            return (
              <View style={[styles.msgWrap, mine && styles.msgWrapMine]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, mine && { color: '#fff' }]}>{item.text}</Text>
                </View>
                <View style={[styles.metaRow, mine && { justifyContent: 'flex-end' }]}>
                  <Text style={[typography.caption, { color: c.muted }]}>{formatTime(item.at)}</Text>
                  {mine && item.read ? (
                    <CheckIcon size={12} color={c.blue} />
                  ) : null}
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <Pressable>
            <IconTile tone="navy">
              <PaperclipIcon color={c.navy} />
            </IconTile>
          </Pressable>
          <View style={styles.inputWrap}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={c.muted}
              style={styles.input}
              multiline
            />
            <Pressable onPress={suggestReply} hitSlop={8}>
              <SparklesIcon
                size={20}
                color={suggesting ? c.blue : c.muted}
              />
            </Pressable>
            <View style={{ width: 6 }} />
            <Pressable hitSlop={8}>
              <MicIcon size={20} color={c.muted} />
            </Pressable>
          </View>
          <Pressable onPress={send}>
            <IconTile tone="blue">
              <SendIcon color="#fff" />
            </IconTile>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg + 4,
    paddingBottom: spacing.md,
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  avatar: {
    marginLeft: spacing.sm + 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.success },
  msgWrap: { marginBottom: spacing.sm + 2, alignItems: 'flex-start', maxWidth: '85%' },
  msgWrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { padding: 10, paddingHorizontal: 14, borderRadius: 16 },
  bubbleOther: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: c.border,
    borderBottomLeftRadius: 4,
  },
  bubbleMine: { backgroundColor: c.navy, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: c.text },
  metaRow: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 4, paddingHorizontal: spacing.sm },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm + 2,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md + 2,
    minHeight: 44,
    gap: 6,
  },
  input: { flex: 1, fontSize: 15, color: c.text, maxHeight: 100 },
});
