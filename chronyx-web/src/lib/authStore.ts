import { Store } from "@tauri-apps/plugin-store";

const store = new Store(".auth.dat");

export async function saveAuthToken(token: string) {
  await store.set("supabase_token", token);
  await store.save();
}

export async function getAuthToken() {
  return await store.get<string>("supabase_token");
}

export async function clearAuthToken() {
  await store.delete("supabase_token");
  await store.save();
}
