import { Redirect } from "expo-router";

// Route digabung ke /onboarding/profile (step 2 dari 2: nama + akun pertama)
export default function CreateAccountRedirect() {
  return <Redirect href="/onboarding/profile" />;
}
