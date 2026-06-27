import * as WebBrowser from "expo-web-browser";
import * as ExpoLinking from "expo-linking";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<"success" | "cancelled" | "error"> {
  const redirectTo = ExpoLinking.createURL("/");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return "error";

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return "cancelled";

  await supabase.auth.exchangeCodeForSession(result.url);
  return "success";
}
