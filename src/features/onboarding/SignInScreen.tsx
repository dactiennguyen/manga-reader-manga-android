import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ScreenProps } from '../../app/routes';
import { Halftone } from '../../components/comic';
import { PenLine, User } from '../../components/icons';
import { Button, FieldLabel, Header, Screen, TextField } from '../../components/ui';
import { useSettings } from '../../store/useSettings';
import { font, radius, space, useTheme } from '../../theme';

const PEN_NAME_MAX = 30;

export function SignInScreen({ navigation, route }: ScreenProps<'SignIn'>) {
  const { c } = useTheme();
  const fromProfile = route.params?.from === 'profile';
  const [name, setName] = useState(() => useSettings.getState().penName);

  const onBack = () => {
    if (!fromProfile) {
      useSettings.getState().set({ onboardingStep: 0 });
    }
    navigation.goBack();
  };

  const onSubmit = () => {
    const penName = name.trim().slice(0, PEN_NAME_MAX);
    if (fromProfile) {
      useSettings.getState().set({ penName });
      navigation.goBack();
      return;
    }
    useSettings.getState().set({ penName, onboardingStep: 2 });
    navigation.navigate('Preferences');
  };

  return (
    <Screen>
      <Header title={fromProfile ? 'Pen name' : ''} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={[styles.logoShadow, { backgroundColor: c.ink }]} />
          <View style={[styles.logo, { backgroundColor: c.surface, borderColor: c.ink }]}>
            <Halftone />
            <PenLine size={40} color={c.accent} />
          </View>
        </View>
        <Text style={[font.display, styles.center, { color: c.text }]}>Mangaka AI</Text>
        <Text style={[font.heading, styles.center, styles.question, { color: c.text }]}>What should we call you?</Text>
        <Text style={[font.body, styles.center, { color: c.textSecondary }]}>
          Your pen name is the author name printed on the credits page when you export.
        </Text>
        <View style={styles.form}>
          <FieldLabel>Pen name</FieldLabel>
          <TextField
            icon={User}
            value={name}
            onChangeText={setName}
            onClear={() => setName('')}
            placeholder="Optional"
            maxLength={PEN_NAME_MAX}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
          <Text style={[font.caption, styles.counter, { color: c.muted }]}>
            {name.length}/{PEN_NAME_MAX}
          </Text>
          <Button title={fromProfile ? 'Save' : 'Continue'} onPress={onSubmit} />
        </View>
        <Text style={[font.caption, styles.center, styles.note, { color: c.muted }]}>
          Your stories are saved on this device. Sign-in and sync are coming later.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, paddingTop: space.lg },
  brand: { alignSelf: 'center', width: 92, height: 92, marginBottom: space.lg },
  logoShadow: { position: 'absolute', left: 4, top: 4, width: 88, height: 88, borderRadius: radius.lg },
  logo: {
    width: 88,
    height: 88,
    borderWidth: 2,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  center: { textAlign: 'center' },
  question: { marginTop: space.xl, marginBottom: space.xs },
  form: { marginTop: space.xl },
  counter: { textAlign: 'right', marginTop: space.xs, marginBottom: space.lg },
  note: { marginTop: space.xl, lineHeight: 18 },
});
