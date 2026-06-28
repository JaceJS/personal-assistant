import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { supabase } from "@/lib/supabase";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
});

export async function signInWithGoogle(): Promise<"success" | "cancelled" | "error"> {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    // Support both older and newer versions of the library API (data wrapping)
    const idToken = userInfo.data?.idToken || (userInfo as { idToken?: string }).idToken;
    if (!idToken) return "error";

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error || !data?.session) return "error";
    return "success";
  } catch (err) {
    const error = err as { code?: string; message?: string };
    if (error.code === "SIGN_IN_CANCELLED" || error.message?.includes("cancelled") || error.code === "12501") {
      return "cancelled";
    }
    return "error";
  }
}
