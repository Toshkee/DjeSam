import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, monospacedDigit, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/**
 * Everything the Lock Screen / Dynamic Island needs. Strings are passed in (already localised)
 * because the widget runtime is isolated and cannot import the app's dictionaries.
 */
export interface ParkingActivityProps {
  /** Epoch ms when the timer started (start of the progress bar). */
  startedAt: number;
  /** Epoch ms when paid parking expires. */
  expiresAt: number;
  title: string;
  /** Address, or floor/section, shown under the countdown. */
  place: string;
  expiresLabel: string;
}

const ParkingActivity = (props: ParkingActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  // Constants must live inside the widget function (isolated runtime).
  const red = environment.isLuminanceReduced ? '#FFFFFF' : '#E5383B';
  const muted = '#9AA4B2';
  const range = { lower: new Date(props.startedAt), upper: new Date(props.expiresAt) };

  const countdown = (size: number) => (
    <Text
      timerInterval={range}
      countsDown
      modifiers={[font({ size, weight: 'bold', design: 'rounded' }), monospacedDigit()]}
    />
  );

  return {
    banner: (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 16 })]}>
        <HStack spacing={10}>
          <Image systemName="parkingsign.circle.fill" color={red} modifiers={[font({ size: 30 })]} />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(muted)]}>{props.title}</Text>
            {countdown(30)}
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={2}>
            <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{props.expiresLabel}</Text>
            <Text
              date={new Date(props.expiresAt)}
              dateStyle="time"
              modifiers={[font({ size: 17, weight: 'semibold' }), monospacedDigit()]}
            />
          </VStack>
        </HStack>
        <ProgressView timerInterval={range} countsDown modifiers={[tint(red)]} />
        {props.place ? (
          <Text modifiers={[font({ size: 13 }), foregroundStyle(muted), frame({ maxWidth: 10000, alignment: 'leading' })]}>
            {props.place}
          </Text>
        ) : null}
      </VStack>
    ),
    compactLeading: <Image systemName="parkingsign.circle.fill" color={red} />,
    compactTrailing: (
      <Text
        timerInterval={range}
        countsDown
        modifiers={[font({ size: 14, weight: 'semibold' }), monospacedDigit(), frame({ width: 52 })]}
      />
    ),
    minimal: <Image systemName="parkingsign.circle.fill" color={red} />,
    expandedLeading: (
      <HStack spacing={6} modifiers={[padding({ leading: 4 })]}>
        <Image systemName="parkingsign.circle.fill" color={red} modifiers={[font({ size: 22 })]} />
        <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>{props.title}</Text>
      </HStack>
    ),
    expandedTrailing: countdown(22),
    expandedBottom: (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ horizontal: 4 })]}>
        <ProgressView timerInterval={range} countsDown modifiers={[tint(red)]} />
        {props.place ? <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>{props.place}</Text> : null}
      </VStack>
    ),
  };
};

export default createLiveActivity('ParkingActivity', ParkingActivity);
