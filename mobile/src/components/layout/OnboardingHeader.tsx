import { StyleSheet, View } from "react-native";
import { OnboardingStepIndicator } from "@/components/ui/OnboardingStepIndicator";
import { spacing } from "@/theme/spacing";

type Props = {
  currentStep: number;
  totalSteps: number;
};

export function OnboardingHeader({ currentStep, totalSteps }: Props) {
  return (
    <View style={styles.container}>
      <OnboardingStepIndicator total={totalSteps} current={currentStep} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: 16,
    paddingBottom: 8,
  },
});
