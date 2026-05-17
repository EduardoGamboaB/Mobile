import { supabase } from './supabase';
import { isDemo, demoStore } from '@/demo';
import type { Profile } from '@/models';

export async function getMyProfile(userId: string): Promise<Profile | null> {
  if (isDemo) return demoStore.getProfile();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateMyProfile(
  userId: string,
  patch: Partial<Profile>,
): Promise<Profile> {
  if (isDemo) return demoStore.patchProfile(patch);
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
}
