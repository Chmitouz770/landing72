import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { useAuth, useUserId } from '@/features/auth/AuthProvider';
import { isDemo } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { Database, Profile } from '@/types/database';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const profileKeys = {
  byId: (id: string) => ['profile', id] as const,
};

async function fetchProfile(id: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export function useMyProfile() {
  const { user } = useAuth();
  const id = user?.id ?? '';
  return useQuery({
    queryKey: profileKeys.byId(id),
    queryFn: () => fetchProfile(id),
    enabled: !!id,
  });
}

export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: profileKeys.byId(id ?? ''),
    queryFn: () => fetchProfile(id!),
    enabled: !!id,
  });
}

export function useUpdateProfile() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.byId(userId), profile);
    },
  });
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Ouvre la galerie, envoie la photo dans le bucket `avatars` et renvoie son URL publique. */
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (isDemo) return asset.uri;
  const contentType = asset.mimeType ?? 'image/jpeg';
  const extension = contentType.split('/')[1] ?? 'jpg';
  const body =
    Platform.OS === 'web' || !asset.base64
      ? await (await fetch(asset.uri)).blob()
      : base64ToBytes(asset.base64);

  const path = `${userId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('avatars').upload(path, body, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
