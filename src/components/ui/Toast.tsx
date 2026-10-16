import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface ToastMessage {
  id: number;
  text: string;
  icon: IconName;
  tone: 'success' | 'info' | 'danger';
}

type Show = (text: string, options?: { icon?: IconName; tone?: ToastMessage['tone'] }) => void;

const ToastContext = createContext<Show>(() => undefined);

/** Lightweight confirmation toast ("Parking sačuvan") that also announces itself to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const counter = useRef(0);

  const show = useCallback<Show>((text, options) => {
    counter.current += 1;
    setMessage({
      id: counter.current,
      text,
      icon: options?.icon ?? 'checkmark-circle',
      tone: options?.tone ?? 'success',
    });
    AccessibilityInfo.announceForAccessibility(text);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && <ToastView key={message.id} message={message} onDone={() => setMessage(null)} />}
    </ToastContext.Provider>
  );
}

function ToastView({ message, onDone }: { message: ToastMessage; onDone: () => void }) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }),
      Animated.delay(2200),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    sequence.start(({ finished }) => finished && onDone());
    return () => sequence.stop();
  }, [anim, onDone]);

  const color = { success: colors.success, info: colors.accent, danger: colors.danger }[message.tone];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.host, { paddingTop: insets.top + 8 }]}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.border,
            borderRadius: radius.pill,
            shadowColor: colors.shadow,
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          },
        ]}
      >
        <Icon name={message.icon} size={20} color={color} />
        <AppText variant="bodyStrong">{message.text}</AppText>
      </Animated.View>
    </View>
  );
}

export function useToast(): Show {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  host: { alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    maxWidth: '90%',
  },
});
