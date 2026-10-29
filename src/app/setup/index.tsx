import { Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { AccessibilityInfo, ScrollViewInstance, View } from 'react-native';

import { BottomBar, Button, Notice, Page, ScrollScreen } from '@/components';
import { useDb } from '@/data/DataProvider';
import { SETUP_STEPS, validateSetupStep } from '@/domain/setup';
import { FieldErrors, hasErrors } from '@/domain/validation';
import { useSetupDraft } from '@/features/setup/SetupDraftContext';
import { SetupProgress } from '@/features/setup/SetupProgress';
import { BusinessStep, ContactStep, OperationsStep, PreferencesStep } from '@/features/setup/steps';
import { spacing } from '@/theme';

const SUBTITLES = [
  'Tell us about your business. You can change these later.',
  'How customers can reach you, and an optional logo.',
  'A few choices that shape how sales and stock work.',
  'Who runs the business and how you want to begin.',
];

const STEP_COMPONENTS = [BusinessStep, ContactStep, PreferencesStep, OperationsStep];

export default function SetupWizard() {
  const db = useDb();
  const router = useRouter();
  const { draft, update, flush, returnToReview, setReturnToReview } = useSetupDraft();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);

  if (db.setupCompletedAt) return <Redirect href="/(tabs)" />;

  const step = Math.min(Math.max(draft.step, 0), SETUP_STEPS.length - 1);
  const Step = STEP_COMPONENTS[step];
  // Re-validate live once the user has tried to continue, so errors clear as they type
  const liveErrors = showErrors ? validateSetupStep(step, draft) : errors;

  const goTo = async (next: number) => {
    setErrors({});
    setShowErrors(false);
    update({ step: next });
    await flush();
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const onContinue = async () => {
    const e = validateSetupStep(step, draft);
    if (hasErrors(e)) {
      setErrors(e);
      setShowErrors(true);
      AccessibilityInfo.announceForAccessibility?.(Object.values(e)[0] as string);
      scroll.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (returnToReview || step === SETUP_STEPS.length - 1) {
      setReturnToReview(false);
      await flush();
      router.push('/setup/review');
      return;
    }
    await goTo(step + 1);
  };

  const onBack = () => {
    if (returnToReview) {
      setReturnToReview(false);
      router.push('/setup/review');
    } else if (step > 0) {
      goTo(step - 1);
    }
  };

  return (
    <Page>
      <SetupProgress step={step} title={SETUP_STEPS[step].title} subtitle={SUBTITLES[step]} />
      <ScrollScreen
        ref={scroll}
        footer={
          <BottomBar>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              {(step > 0 || returnToReview) && <Button label="Back" variant="secondary" onPress={onBack} style={{ minWidth: 100 }} />}
              <Button
                label={returnToReview ? 'Save and review' : step === SETUP_STEPS.length - 1 ? 'Review details' : 'Continue'}
                onPress={onContinue}
                style={{ flex: 1 }}
              />
            </View>
          </BottomBar>
        }
      >
        {showErrors && hasErrors(liveErrors) && (
          <Notice tone="danger" message="Some details need your attention before you continue." />
        )}
        <Step draft={draft} update={update} errors={liveErrors} />
      </ScrollScreen>
    </Page>
  );
}
