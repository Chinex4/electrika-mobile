/**
 * One marketplace conversation (25 Nov 2026): live messages over the socket,
 * offers and counter-offers, photos, read receipts and typing. Messages go
 * out over the API; while the socket is down the screen checks every 4 s.
 */
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { api, photoPart, remoteImage, toFailure } from '@/api/client';
import { useMarketConfig } from '@/components/market';
import {
  Banner, Button, Choices, cx, Failed, Field, IconButton, icons, ListGroup, Loading, pickPhoto, Row, Screen, Sheet,
} from '@/components/ui';
import { useT } from '@/i18n';
import { naira, when } from '@/lib/format';
import { notify } from '@/lib/toast';
import { marketSocket, useLive, useMarketEvents } from '@/market/socket';
import { useAppDispatch } from '@/store/hooks';
import { invalidate } from '@/store/slices/resources';
import { useColors } from '@/theme';
import type { ConversationDetail, Message, Offer } from '@/types/market';

export default function Chat() {
  const t = useT();
  const colors = useColors();
  const dispatch = useAppDispatch();
  const config = useMarketConfig();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversation = Number(id);
  const live = useLive();
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<ReturnType<typeof toFailure> | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [menu, setMenu] = useState(false);
  const [offering, setOffering] = useState<null | { counter?: Offer }>(null);
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTyping = useRef(0);
  const side = conv?.side;

  const merge = useCallback((incoming: Message[]) => {
    setMessages((old) => {
      const byId = new Map(old.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => a.id - b.id);
    });
  }, []);

  const markRead = useCallback(() => {
    if (marketSocket.live) marketSocket.send({ type: 'read', conversation });
    else api(`/market/conversations/${conversation}/read/`, { method: 'POST' }).catch(() => {});
    dispatch(invalidate(['/market/unread/', '/market/conversations/']));
  }, [conversation, dispatch]);

  const load = useCallback(async () => {
    try {
      const data = await api<ConversationDetail>(`/market/conversations/${conversation}/`);
      setConv(data);
      merge(data.messages);
      setError(null);
      markRead();
    } catch (e) {
      setError(toFailure(e));
    }
  }, [conversation, merge, markRead]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // While the socket is down: check for new messages every 4 seconds.
  const lastId = messages.length ? messages[messages.length - 1].id : 0;
  useEffect(() => {
    if (live || !conv) return;
    const timer = setInterval(async () => {
      try {
        const data = await api<ConversationDetail>(`/market/conversations/${conversation}/?after=${lastId}`);
        merge(data.messages);
        setConv((c) => (c ? { ...data, messages: [] } : c));
        if (data.messages.some((m) => m.side !== data.side)) markRead();
      } catch {
        // keep trying
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [live, conv, conversation, lastId, merge, markRead]);

  useMarketEvents((e) => {
    if (!('conversation' in e) || e.conversation !== conversation) return;
    if (e.type === 'message.new') {
      merge([{ ...e.message, mine: e.message.side === side }]);
      if (e.message.side !== side) {
        setTyping(false);
        markRead();
      }
      if (e.message.kind === 'OFFER') load();
    } else if (e.type === 'message.read' && e.side !== side) {
      setConv((c) => (c ? { ...c, other_read_at: e.read_at } : c));
    } else if (e.type === 'typing' && e.side !== side) {
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3500);
    } else if (e.type === 'offer.updated' || e.type === 'conversation.blocked') {
      load();
    }
  });

  const onType = (value: string) => {
    setText(value);
    if (Date.now() - lastTyping.current > 2500) {
      lastTyping.current = Date.now();
      marketSocket.send({ type: 'typing', conversation });
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const m = await api<Message>(`/market/conversations/${conversation}/messages/`, { method: 'POST', body: { text: body } });
      setText('');
      merge([m]);
    } catch (e) {
      notify.error(toFailure(e).message);
    } finally {
      setSending(false);
    }
  };

  const sendPhoto = async () => {
    const uri = await pickPhoto('library');
    if (!uri) return;
    const form = new FormData();
    form.append('image', photoPart(uri, 'chat.jpg'));
    try {
      merge([await api<Message>(`/market/conversations/${conversation}/messages/`, { method: 'POST', body: form })]);
    } catch (e) {
      notify.error(toFailure(e).message);
    }
  };

  const offerAction = async (offer: Offer, action: 'accept' | 'reject' | 'withdraw') => {
    try {
      await api(`/market/offers/${offer.id}/${action}/`, { method: 'POST', body: {} });
      load();
    } catch (e) {
      notify.error(toFailure(e).message);
      load();
    }
  };

  const submitOffer = async () => {
    try {
      if (offering?.counter) await api(`/market/offers/${offering.counter.id}/counter/`, { method: 'POST', body: { amount } });
      else await api(`/market/conversations/${conversation}/offers/`, { method: 'POST', body: { amount, quantity: Number(quantity) || 1 } });
      setOffering(null);
      setAmount('');
      load();
    } catch (e) {
      notify.error(toFailure(e).message);
    }
  };

  const older = async () => {
    if (!messages.length) return;
    const data = await api<ConversationDetail>(`/market/conversations/${conversation}/?before=${messages[0].id}`);
    merge(data.messages);
    setConv((c) => (c ? { ...c, has_more: data.has_more } : c));
  };

  const blockedByMe = !!(conv && side && conv.blocked_by.includes(side));
  const blocked = !!conv?.blocked_by.length;
  const other = conv ? (conv.side === 'BUYER' ? conv.vendor.name : conv.buyer.name) : '';
  const lastMine = useMemo(() => [...messages].reverse().find((m) => m.side === side && m.kind !== 'SYSTEM'), [messages, side]);
  const seen = !!(lastMine && conv?.other_read_at && new Date(conv.other_read_at) >= new Date(lastMine.created_at));
  const open = conv?.open_offer;

  const renderItem = ({ item: m }: { item: Message }) => {
    const mine = m.side === side;
    if (m.kind === 'OFFER' || m.kind === 'SYSTEM') {
      const agreed = m.offer?.status === 'ACCEPTED' && m.body.startsWith('Price agreed');
      return (
        <View className="items-center py-1">
          <View className={cx('max-w-[90%] rounded-xl px-3 py-2', agreed ? 'bg-leaf-bg' : 'bg-mist')}>
            <Text className={cx('text-center text-[13px]', agreed ? 'font-semibold text-leaf-ink' : 'text-ink')}>{m.body}</Text>
          </View>
          <Text className="mt-0.5 text-[10.5px] text-faint">{when(m.created_at)}</Text>
        </View>
      );
    }
    return (
      <View className={cx('py-1', mine ? 'items-end' : 'items-start')}>
        <View className={cx('max-w-[80%] rounded-2xl px-3.5 py-2', mine ? 'rounded-br-md bg-brand' : 'rounded-bl-md bg-surface')}>
          {m.image_url ? <Image source={remoteImage(m.image_url)} style={{ width: 220, height: 220, borderRadius: 12 }} contentFit="cover" accessibilityLabel={t('mk.photo')} /> : null}
          {m.body ? <Text className={cx('text-[15px]', mine ? 'text-white' : 'text-navy')}>{m.body}</Text> : null}
        </View>
        <Text className="mt-0.5 px-1 text-[10.5px] text-faint">
          {when(m.created_at)}
          {lastMine && m.id === lastMine.id ? ` · ${seen ? t('mk.seen') : t('mk.sent')}` : ''}
        </Text>
      </View>
    );
  };

  return (
    <Screen
      scroll={false}
      className="px-0 pt-0"
      footer={
        conv ? (
          blocked ? (
            <Banner tone="amber">{t('mk.blocked')}</Banner>
          ) : (
            <View className="gap-2">
              <View className="flex-row items-end gap-2">
                <IconButton icon={icons.photo} label={t('mk.photo')} variant="surface" onPress={sendPhoto} />
                {conv.listing?.negotiable ? <IconButton icon={icons.tag} label={t('mk.makeOffer')} variant="surface" onPress={() => setOffering({})} /> : null}
                <TextInput
                  value={text}
                  onChangeText={onType}
                  placeholder={t('mk.write')}
                  placeholderTextColor={colors.faint}
                  multiline
                  maxLength={2000}
                  accessibilityLabel={t('mk.write')}
                  className="max-h-32 min-h-[44px] flex-1 rounded-2xl border border-edge bg-surface px-3.5 py-2.5 text-navy"
                  style={{ fontSize: 16 }}
                />
                <IconButton icon={icons.send} label={t('mk.send')} variant="primary" onPress={() => (sending ? null : send())} />
              </View>
              <Text className="text-center text-[11px] text-muted">{t('mk.payDirect')}</Text>
            </View>
          )
        ) : null
      }>
      <Stack.Screen
        options={{
          title: other,
          headerRight: conv ? () => <IconButton icon={{ sf: 'ellipsis', md: 'more_vert' }} label={t('mk.report')} variant="surface" onPress={() => setMenu(true)} /> : undefined,
        }}
      />
      {!conv && !error ? <View className="p-4"><Loading rows={5} /></View> : null}
      {error && !conv ? <View className="p-4"><Failed error={error} onRetry={load} /></View> : null}
      {conv ? (
        <View className="flex-1">
          <View className="gap-2 border-b border-line bg-page px-4 py-2">
            <Text className="text-[12px] text-muted">
              {conv.online ? t('mk.online') : t('mk.offline')}
              {!live ? ` · ${t('mk.reconnecting')}` : ''}
            </Text>
            {conv.listing ? (
              <Pressable
                disabled={!conv.listing.slug}
                onPress={() => conv.listing?.slug && router.push(`/market/item/${conv.listing.slug}` as Href)}
                className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-2.5">
                {conv.listing.image_url ? <Image source={remoteImage(conv.listing.image_url)} style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: '#fff' }} contentFit="contain" /> : null}
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-navy" numberOfLines={1}>{conv.listing.title}</Text>
                  <Text className="text-[12px] text-muted">
                    {t('mk.listedAt', { price: naira(conv.listing.price) })} · {conv.vendor.name}
                  </Text>
                  {conv.agreed_price ? <Text className="text-[12.5px] font-bold text-leaf-ink">{t('mk.agreed', { price: naira(conv.agreed_price) })}</Text> : null}
                </View>
              </Pressable>
            ) : null}
          </View>
          <FlatList
            inverted
            data={[...messages].reverse()}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            onEndReached={() => conv.has_more && older()}
            onEndReachedThreshold={0.2}
            ListHeaderComponent={
              <>
                {typing ? <Text className="py-1 text-[12px] italic text-muted">{t('mk.typing')}</Text> : null}
                {open ? (
                  <View className="my-2 gap-1.5 rounded-2xl border border-haze-edge bg-haze p-3">
                    <Text className="text-[15px] font-bold text-navy">
                      {open.side === side ? t('mk.yourOffer', { price: naira(open.amount) }) : t('mk.theirOffer', { price: naira(open.amount) })}
                      {open.quantity > 1 ? ` × ${open.quantity}` : ''}
                    </Text>
                    <Text className="text-[12px] text-muted">{t('mk.openUntil', { when: when(open.expires_at) })}</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {open.can_respond ? (
                        <>
                          <Button title={t('mk.accept')} size="sm" variant="success" onPress={() => offerAction(open, 'accept')} />
                          <Button title={t('mk.decline')} size="sm" variant="secondary" onPress={() => offerAction(open, 'reject')} />
                          <Button title={t('mk.counter')} size="sm" variant="secondary" onPress={() => setOffering({ counter: open })} />
                        </>
                      ) : null}
                      {open.can_withdraw ? <Button title={t('mk.withdraw')} size="sm" variant="secondary" onPress={() => offerAction(open, 'withdraw')} /> : null}
                    </View>
                  </View>
                ) : null}
              </>
            }
            ListFooterComponent={conv.has_more ? <Button title={t('mk.earlier')} size="sm" variant="ghost" onPress={older} /> : undefined}
          />
        </View>
      ) : null}

      <Sheet open={!!offering} onClose={() => setOffering(null)} title={offering?.counter ? t('mk.counterTitle') : t('mk.makeOffer')}
        sub={conv?.listing ? `${conv.listing.title} · ${naira(conv.listing.price)}` : undefined}
        footer={<Button title={t('mk.sendOffer')} disabled={!amount} onPress={submitOffer} />}>
        <Field label={t('mk.offerAmount')} keyboardType="number-pad" value={amount} onChangeText={setAmount} autoFocus />
        {!offering?.counter ? <Field label={t('mk.quantity')} keyboardType="number-pad" value={quantity} onChangeText={setQuantity} /> : null}
      </Sheet>

      <Sheet open={menu} onClose={() => setMenu(false)} title={other}>
        <ListGroup>
          <Row title={t('mk.archive')} icon={icons.box} tone="grey"
            onPress={async () => {
              await api(`/market/conversations/${conversation}/archive/`, { method: 'POST', body: { archived: true } }).catch(() => {});
              dispatch(invalidate(['/market/conversations/']));
              setMenu(false);
              if (router.canGoBack()) router.back();
              else router.replace('/market/messages' as Href);
            }} />
          <Row title={blockedByMe ? t('mk.unblock') : t('mk.block')} icon={icons.lock} tone="amber"
            onPress={() => {
              const go = async () => {
                await api(`/market/conversations/${conversation}/block/`, { method: 'POST', body: { blocked: !blockedByMe } }).catch(() => {});
                setMenu(false);
                load();
              };
              if (blockedByMe) go();
              else Alert.alert(t('mk.block'), t('mk.blockConfirm'), [{ text: t('mk.cancel'), style: 'cancel' }, { text: t('mk.block'), style: 'destructive', onPress: go }]);
            }} />
          <Row title={t('mk.reportChat')} icon={icons.warning} tone="alert" destructive last
            onPress={() => {
              setMenu(false);
              setReporting(true);
            }} />
        </ListGroup>
      </Sheet>

      <Sheet open={reporting} onClose={() => setReporting(false)} title={t('mk.reportChat')} sub={t('mk.reportChatNote')}
        footer={<Button title={t('mk.reportSend')} variant="danger" disabled={!reason}
          onPress={async () => {
            try {
              const r = await api<{ detail: string }>(`/market/conversations/${conversation}/report/`, { method: 'POST', body: { reason, details } });
              notify.success(r.detail);
              setReporting(false);
            } catch (e) {
              notify.error(toFailure(e).message);
            }
          }} />}>
        <Choices options={(config?.chat_report_reasons ?? []).map((r) => ({ key: r.value, label: r.label }))} value={reason} onChange={setReason} />
        <Field label={t('mk.reportDetails')} multiline value={details} onChangeText={setDetails} />
      </Sheet>
    </Screen>
  );
}
