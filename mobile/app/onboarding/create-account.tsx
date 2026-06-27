import { Redirect } from "expo-router";

// Route dipindah ke /onboarding/profile (step 2) + /onboarding/first-account (step 3)
export default function CreateAccountRedirect() {
  return <Redirect href="/onboarding/profile" />;
}
