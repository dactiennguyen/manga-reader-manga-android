import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AiErrorBox, AiLoading } from '../../components/ai';
import { Banner } from '../../components/comic';
import { CircleCheck, Wifi } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { Button, FieldLabel, TextField, toast } from '../../components/ui';
import { normalizeBaseUrl, testConnection } from '../../lib/ai/client';
import { useAiTask } from '../../lib/ai/useAiTask';
import { useSettings } from '../../store/useSettings';
import { font, space, useTheme } from '../../theme';

const DEFAULT_MODEL = 'gemini-3.6-flash';
const ADDRESS_MAX = 200;
const KEY_MAX = 300;
const MODEL_MAX = 80;

export function AiServerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const [address, setAddress] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const { state, start, cancel } = useAiTask<string>();

  useEffect(() => {
    if (visible) {
      const settings = useSettings.getState();
      setAddress(settings.aiBaseUrl);
      setApiKey(settings.aiApiKey);
      setModel(settings.aiModel);
    } else {
      cancel();
    }
  }, [visible, cancel]);

  const resolved = normalizeBaseUrl(address);

  const edit = (apply: (value: string) => void) => (value: string) => {
    apply(value);
    if (state.status !== 'idle') {
      cancel();
    }
  };

  const test = () => {
    start(() => testConnection(address, apiKey, model));
  };

  const save = () => {
    const nextAddress = address.trim();
    useSettings.getState().set({
      aiBaseUrl: nextAddress,
      aiApiKey: apiKey.trim(),
      aiModel: model.trim() || DEFAULT_MODEL,
    });
    toast(nextAddress ? 'AI server saved' : 'AI turned off');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="AI server" subtitle="Runs on a server you control">
      <View style={styles.body}>
        <View style={styles.field}>
          <FieldLabel>Server address</FieldLabel>
          <TextField
            value={address}
            onChangeText={edit(setAddress)}
            onClear={() => edit(setAddress)('')}
            placeholder="10.0.2.2:8081"
            maxLength={ADDRESS_MAX}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={[font.caption, { color: c.muted }]}>
            An OpenAI-compatible server. On the Android emulator the host computer is 10.0.2.2. Leave empty to turn AI
            off.
          </Text>
          {!!resolved && (
            <Text numberOfLines={1} style={[font.caption, { color: c.textSecondary }]}>
              Connects to {resolved}
            </Text>
          )}
        </View>
        <View style={styles.field}>
          <FieldLabel>API key (optional)</FieldLabel>
          <TextField
            value={apiKey}
            onChangeText={edit(setApiKey)}
            placeholder="Only if your server asks for one"
            maxLength={KEY_MAX}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>
        <View style={styles.field}>
          <FieldLabel>Model</FieldLabel>
          <TextField
            value={model}
            onChangeText={edit(setModel)}
            placeholder={DEFAULT_MODEL}
            maxLength={MODEL_MAX}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {state.status === 'loading' && <AiLoading label="Contacting the server…" onCancel={cancel} />}
        {state.status === 'done' && (
          <Banner tone="success" icon={CircleCheck} text="Connected. The server answered the test message." />
        )}
        {state.status === 'error' && <AiErrorBox message={state.message} onRetry={test} onDismiss={cancel} />}
        {(state.status === 'idle' || state.status === 'done') && (
          <Button
            title={state.status === 'done' ? 'Test again' : 'Test connection'}
            variant="secondary"
            icon={Wifi}
            onPress={test}
            disabled={!resolved}
          />
        )}

        <View style={styles.actions}>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={styles.flex} />
          <Button title="Save" onPress={save} style={styles.flex} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.sm, gap: space.md },
  field: { gap: space.xs },
  actions: { flexDirection: 'row', gap: space.md },
});
