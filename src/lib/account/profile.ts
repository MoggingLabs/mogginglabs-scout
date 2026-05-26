import type { SupabaseClient, User } from "@supabase/supabase-js";

import { ProfileNotProvisionedError } from "@/lib/account/errors";
import type { Database } from "@/lib/supabase/types";
import type { Profile } from "@/lib/types/profile";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function ensureProfile(
  supabase: Pick<SupabaseClient<Database>, "from">,
  user: Pick<User, "id">
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ProfileNotProvisionedError(user.id);
  }

  return mapProfileRow(data);
}
