import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
});

export async function signInWithGoogle(): Promise<"success" | "cancelled" | "error"> {
  try {
    await GoogleSignin.hasPlayServices();
    logger.debug("google_signin_start");

    const userInfo = await GoogleSignin.signIn();

    // Support both older and newer versions of the library API (data wrapping)
    const idToken = userInfo.data?.idToken || (userInfo as { idToken?: string }).idToken;
    if (!idToken) {
      logger.error("google_signin_no_id_token", new Error("idToken missing after signIn"));
      return "error";
    }

    logger.debug("google_signin_got_token");

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      logger.error("supabase_signin_failed", error, { error_code: error.code });
      return "error";
    }
    if (!data?.session) {
      logger.error("supabase_signin_no_session", new Error("session null after signInWithIdToken"));
      return "error";
    }

    logger.info("google_signin_success");
    return "success";
  } catch (err) {
    const error = err as { code?: string };
    if (
      error.code === "SIGN_IN_CANCELLED" ||
      error.code === "12501" ||
      (err instanceof Error && err.message?.includes("cancelled"))
    ) {
      logger.debug("google_signin_cancelled", { code: error.code });
      return "cancelled";
    }
    logger.error("google_signin_failed", err as Error, { code: error.code });
    return "error";
  }
}
