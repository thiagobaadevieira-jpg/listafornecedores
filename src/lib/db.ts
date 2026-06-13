import { supabase } from './supabase';
import type { Supplier, Banner, Client } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Category = { id: string; name: string; color: string; initials: string; demo_access?: boolean };

export type Profile = {
  id: string;
  name: string;
  color: string;
  initials: string;
  photo_url?: string | null;
  role: 'admin' | 'client';
};

export type AppSettings = { notificationTitle: string; notificationMessage: string };

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as Profile;
}

export async function upsertProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'role'>>
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(cat: Omit<Category, 'id'>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert(cat)
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(id: string, updates: Partial<Omit<Category, 'id'>>): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

const SUPPLIER_LIST_COLS = 'id, code, name, category, categories, instagram, photo_url, demo_access, is_new, created_at';
const SUPPLIER_DETAIL_COLS = 'id, code, name, category, categories, instagram, photo_url, note, demo_access, is_new, created_at';

export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select(SUPPLIER_LIST_COLS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as any[]).map(row => ({
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    instagram: row.instagram,
    photoUrl: row.photo_url,
    demoAccess: row.demo_access ?? false,
    isNew: row.is_new ?? false,
    isFavorite: false,
    categories: row.categories ?? [row.category],
    createdAt: row.created_at,
  })) as Supplier[];
}

export async function getSuppliersWithFavorites(userId: string): Promise<Supplier[]> {
  const { data, error } = await supabase.rpc('get_suppliers_view', { p_user_id: userId });
  if (error) throw error;
  return (data as any[]).map(row => ({
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    instagram: row.instagram,
    photoUrl: row.photo_url,
    demoAccess: row.demo_access ?? false,
    isUnlocked: row.is_unlocked ?? true,
    isNew: row.is_new ?? false,
    isFavorite: row.is_favorite ?? false,
    categories: row.categories ?? [row.category],
    createdAt: row.created_at,
  })) as Supplier[];
}

export async function getSupplierDetail(id: string): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from('suppliers')
    .select(SUPPLIER_DETAIL_COLS)
    .eq('id', id)
    .single();
  if (error) return null;
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    category: data.category,
    instagram: data.instagram,
    photoUrl: data.photo_url,
    note: data.note,
    demoAccess: data.demo_access ?? false,
    isNew: data.is_new ?? false,
    isFavorite: false,
    categories: data.categories ?? [data.category],
    createdAt: data.created_at,
  };
}

export async function createSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'code' | 'isFavorite'>): Promise<Supplier> {
  const { data: row, error } = await supabase
    .from('suppliers')
    .insert({
      name: data.name,
      category: data.categories?.[0] ?? data.category,
      categories: data.categories ?? [data.category],
      instagram: data.instagram ?? null,
      photo_url: data.photoUrl ?? null,
      note: data.note ?? null,
      demo_access: data.demoAccess ?? false,
      is_new: data.isNew ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    instagram: row.instagram,
    photoUrl: row.photo_url,
    note: row.note,
    demoAccess: row.demo_access ?? false,
    isNew: row.is_new ?? false,
    isFavorite: false,
    createdAt: row.created_at,
  };
}

export async function updateSupplier(
  id: string,
  data: Partial<Omit<Supplier, 'id' | 'createdAt' | 'isFavorite'>>
): Promise<void> {
  const { error } = await supabase
    .from('suppliers')
    .update({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.instagram !== undefined && { instagram: data.instagram }),
      ...(data.photoUrl !== undefined && { photo_url: data.photoUrl }),
      ...(data.note !== undefined && { note: data.note }),
      ...(data.demoAccess !== undefined && { demo_access: data.demoAccess }),
      ...(data.isNew !== undefined && { is_new: data.isNew }),
      ...(data.categories !== undefined && { categories: data.categories, category: data.categories[0] ?? '' }),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadSupplierPhoto(file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('suppliers')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('suppliers').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export async function toggleFavoriteSupplier(supplierId: string, userId: string, isFavorite: boolean): Promise<void> {
  if (isFavorite) {
    const { error } = await supabase
      .from('supplier_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('supplier_id', supplierId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('supplier_favorites')
      .insert({ user_id: userId, supplier_id: supplierId });
    if (error) throw error;
  }
}

// ─── Banners ──────────────────────────────────────────────────────────────────

export async function getBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('position');
  if (error) throw error;
  return (data as any[]).map(row => ({
    id: row.id,
    photoUrl: row.photo_url,
    link: row.link,
  })) as Banner[];
}

export async function createBanner(data: Omit<Banner, 'id'>): Promise<Banner> {
  const { count } = await supabase.from('banners').select('*', { count: 'exact', head: true });
  if ((count ?? 0) >= 3) throw new Error('Máximo de 3 banners');
  const { data: row, error } = await supabase
    .from('banners')
    .insert({ photo_url: data.photoUrl, link: data.link ?? null, position: count ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return { id: row.id, photoUrl: row.photo_url, link: row.link };
}

export async function updateBanner(id: string, data: Partial<Omit<Banner, 'id'>>): Promise<void> {
  const { error } = await supabase
    .from('banners')
    .update({
      ...(data.photoUrl !== undefined && { photo_url: data.photoUrl }),
      ...(data.link !== undefined && { link: data.link }),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw error;
}

async function convertToWebP(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Falha ao converter imagem')); return; }
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' }));
      }, 'image/webp', 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar imagem')); };
    img.src = url;
  });
}

export async function uploadBannerPhoto(file: File): Promise<string> {
  // Supabase não suporta AVIF — converte para WebP antes de enviar
  const uploadFile = file.type === 'image/avif' ? await convertToWebP(file) : file;
  const ext = uploadFile.name.split('.').pop()?.toLowerCase() ?? 'webp';
  const path = `${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('banners')
    .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type });
  if (error) throw error;
  const { data } = supabase.storage.from('banners').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClientByEmail(email: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('email', email)
    .single();
  if (error) return null;
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone ?? '',
    active: data.active,
    isDemo: data.is_demo ?? false,
    createdAt: data.created_at,
  };
}

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as any[]).map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? '',
    active: row.active,
    isDemo: row.is_demo ?? false,
    createdAt: row.created_at,
  })) as Client[];
}

export async function createClient(data: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
  const { data: row, error } = await supabase
    .from('clients')
    .insert({ name: data.name, email: data.email, phone: data.phone || null, active: data.active, is_demo: data.isDemo ?? false })
    .select()
    .single();
  if (error) throw error;
  return { id: row.id, name: row.name, email: row.email, phone: row.phone ?? '', active: row.active, isDemo: row.is_demo ?? false, createdAt: row.created_at };
}

export async function updateClient(id: string, data: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<void> {
  const { error } = await supabase.from('clients').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleClientStatus(id: string): Promise<void> {
  const { data } = await supabase.from('clients').select('active').eq('id', id).single();
  const { error } = await supabase.from('clients').update({ active: !data?.active }).eq('id', id);
  if (error) throw error;
}

export async function toggleDemoAccess(id: string): Promise<boolean> {
  // Inverte direto no banco com is_demo = NOT is_demo (operação atômica)
  // e retorna o novo valor confirmado pelo Postgres
  const { data, error } = await supabase
    .rpc('toggle_client_demo', { p_id: id });
  if (error) throw error;
  if (data === null || data === undefined) {
    throw new Error('Cliente não encontrado ou sem permissão.');
  }
  return data as boolean;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function getRoleByEmail(email: string): Promise<'admin' | 'client' | null> {
  const { data } = await supabase.rpc('get_role_by_email', { p_email: email });
  return data ?? null;
}

export async function clientLogin(email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('client-login', {
    body: { email },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.token,
    type: 'email',
  });
  if (verifyError) throw verifyError;
}

// ─── System Settings ──────────────────────────────────────────────────────────

export async function getSystemLogoUrl(): Promise<string | null> {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'logo_url')
    .single();
  return data?.value ?? null;
}

export async function setSystemLogoUrl(url: string | null): Promise<void> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key: 'logo_url', value: url });
  if (error) throw error;
}

export async function uploadSystemLogo(file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `system/logo.${ext}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ─── Install Video ────────────────────────────────────────────────────────────

export async function getInstallVideoUrl(): Promise<string | null> {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'install_video_url')
    .single();
  return data?.value ?? null;
}

export async function setInstallVideoUrl(url: string | null): Promise<void> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key: 'install_video_url', value: url });
  if (error) throw error;
}

export async function uploadInstallVideo(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4';
  const path = `system/install.${ext}`;
  const { error } = await supabase.storage
    .from('videos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('videos').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ─── Upgrade URL (conta demo → completa) ──────────────────────────────────────

export async function getUpgradeUrl(): Promise<string> {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'upgrade_url')
    .single();
  return data?.value ?? '';
}

export async function setUpgradeUrl(url: string): Promise<void> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key: 'upgrade_url', value: url });
  if (error) throw error;
}

// ─── Demo Register ────────────────────────────────────────────────────────────

export async function demoRegister(name: string, email: string, phone: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('demo-register', {
    body: { name, email, phone },
  });
  if (error) throw error;
  if (data?.error) {
    if (data.error === 'email_already_registered') throw new Error('email_already_registered');
    throw new Error(data.error);
  }
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.token,
    type: 'email',
  });
  if (verifyError) throw verifyError;
}

// ─── Push Notifications ───────────────────────────────────────────────────────

export type Notification = {
  id: string;
  title: string;
  body: string;
  photo_url: string | null;
  sent_by: string | null;
  recipients_count: number | null;
  sent_at: string | null;
};

const VAPID_PUBLIC_KEY = 'BPHpXtUy54m7SnPWKN0c8Kf42JZ20Ps1Vtd_-ct6lzp8_unhUm6Cx2hVbxEKQ43nJTzu6tfMXRzJiXGlzF3xZi8';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function registerPushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const key = sub.getKey('p256dh');
    const auth = sub.getKey('auth');
    if (!key || !auth) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('push_subscriptions').upsert({
      endpoint: sub.endpoint,
      p256dh: arrayBufferToBase64Url(key),
      auth: arrayBufferToBase64Url(auth),
      user_id: user?.id ?? null,
    }, { onConflict: 'endpoint' });
  } catch (err) {
    console.error('Push subscription failed:', err);
  }
}

export async function getLatestNotification(): Promise<Notification | null> {
  const { data } = await supabase
    .from('notifications')
    .select('id, title, body, photo_url, sent_by, recipients_count, sent_at')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Notification | null;
}

export async function getNotificationsHistory(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, photo_url, sent_by, recipients_count, sent_at')
    .order('sent_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadNotificationPhoto(file: File): Promise<string> {
  const uploadFile = file.type === 'image/avif' ? await convertToWebP(file) : file;
  const ext = uploadFile.name.split('.').pop()?.toLowerCase() ?? 'webp';
  const path = `${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('notifications')
    .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type });
  if (error) throw error;
  const { data } = supabase.storage.from('notifications').getPublicUrl(path);
  return data.publicUrl;
}

export async function sendPushNotification(title: string, body: string, photoUrl?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('send-push-notification', {
    body: { title, body, photoUrl: photoUrl ?? null },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

// ─── App Settings (compat stub) ───────────────────────────────────────────────
export async function getAppSettings(): Promise<AppSettings> {
  return { notificationTitle: '', notificationMessage: '' };
}
export async function updateAppSettings(_updates: Partial<AppSettings>, _userId: string): Promise<void> {}
export async function getUsers() { return []; }
export async function getUserProfile(userId: string) { return getProfile(userId); }
export async function upsertUserProfile(userId: string, profile: any) { return upsertProfile(userId, profile); }
export async function uploadReceipt(_file: File, _userId: string): Promise<string> { return ''; }
