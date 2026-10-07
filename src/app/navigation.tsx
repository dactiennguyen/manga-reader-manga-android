import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { House, LibraryBig, Plus, Sparkles, User, type LucideIcon } from '../components/icons';
import { AssistantScreen } from '../features/assistant/AssistantScreen';
import { CanvasScreen } from '../features/canvas/CanvasScreen';
import { CharacterScreen } from '../features/characters/CharacterScreen';
import { ExportScreen } from '../features/export/ExportScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { LetteringScreen } from '../features/lettering/LetteringScreen';
import { LibraryScreen } from '../features/library/LibraryScreen';
import { PreferencesScreen } from '../features/onboarding/PreferencesScreen';
import { SignInScreen } from '../features/onboarding/SignInScreen';
import { WelcomeScreen } from '../features/onboarding/WelcomeScreen';
import { OutlineScreen } from '../features/outline/OutlineScreen';
import { PanelLayoutScreen } from '../features/page/PanelLayoutScreen';
import { PreviewScreen } from '../features/preview/PreviewScreen';
import { AboutScreen } from '../features/profile/AboutScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { TrashScreen } from '../features/profile/TrashScreen';
import { NewProjectScreen } from '../features/project/NewProjectScreen';
import { ProjectScreen } from '../features/project/ProjectScreen';
import { ScriptScreen } from '../features/script/ScriptScreen';
import { StoryboardScreen } from '../features/storyboard/StoryboardScreen';
import { WorldEntryScreen } from '../features/world/WorldEntryScreen';
import { WorldScreen } from '../features/world/WorldScreen';
import { useSettings } from '../store/useSettings';
import { useTheme } from '../theme';
import { useAppNavigation, type RootStackParamList, type TabParamList } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_META: Record<keyof TabParamList, { label: string; icon: LucideIcon }> = {
  Home: { label: 'Home', icon: House },
  Library: { label: 'Library', icon: LibraryBig },
  Assistant: { label: 'Assistant', icon: Sparkles },
  Profile: { label: 'Profile', icon: User },
};

function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const root = useAppNavigation();

  const renderTab = (index: number) => {
    const route = state.routes[index];
    const meta = TAB_META[route.name as keyof TabParamList];
    const focused = state.index === index;
    const Icon = meta.icon;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={meta.label}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }}
        style={styles.tab}
      >
        <Icon size={24} color={focused ? c.accent : c.muted} fill={focused ? c.accent : 'none'} />
        <Text style={[styles.tabLabel, { color: focused ? c.accent : c.muted }]}>{meta.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.tabBar, { backgroundColor: c.surface, borderTopColor: c.ink, paddingBottom: insets.bottom }]}>
      {renderTab(0)}
      {renderTab(1)}
      <View style={styles.tab}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New story"
          onPress={() => root.navigate('NewProject')}
          style={({ pressed }) => [
            styles.createButton,
            { backgroundColor: c.accent, borderColor: c.ink, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Plus size={28} color={c.onAccent} />
        </Pressable>
      </View>
      {renderTab(2)}
      {renderTab(3)}
    </View>
  );
}

const renderTabBar = (props: BottomTabBarProps) => <AppTabBar {...props} />;

function Tabs() {
  return (
    <Tab.Navigator tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Assistant" component={AssistantScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { c } = useTheme();
  const onboarded = useSettings(s => s.onboarded);
  return (
    <Stack.Navigator
      initialRouteName={onboarded ? 'Tabs' : 'Welcome'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
      <Stack.Screen name="Tabs" component={Tabs} options={{ animation: 'fade' }} />
      <Stack.Screen name="NewProject" component={NewProjectScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Project" component={ProjectScreen} />
      <Stack.Screen name="Outline" component={OutlineScreen} />
      <Stack.Screen name="Script" component={ScriptScreen} />
      <Stack.Screen name="Character" component={CharacterScreen} />
      <Stack.Screen name="World" component={WorldScreen} />
      <Stack.Screen name="WorldEntry" component={WorldEntryScreen} />
      <Stack.Screen name="Storyboard" component={StoryboardScreen} />
      <Stack.Screen name="PanelLayout" component={PanelLayoutScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Canvas" component={CanvasScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen
        name="Lettering"
        component={LetteringScreen}
        options={{ gestureEnabled: false, animation: 'none' }}
      />
      <Stack.Screen name="Preview" component={PreviewScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Export" component={ExportScreen} />
      <Stack.Screen name="Trash" component={TrashScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderTopWidth: 2 },
  tab: { flex: 1, height: 60, alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 0 },
  tabLabel: { fontSize: 11, fontWeight: '700' },
  createButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    elevation: 4,
  },
});
