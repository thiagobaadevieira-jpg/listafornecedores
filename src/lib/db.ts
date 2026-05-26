import { supabase } from './supabase';
import type { Supplier, Banner, Client } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Category = { id: string; name: string; color: string; initials: string };

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

const SUPPLIER_LIST_COLS = 'id, code, name, category, instagram, photo_url, created_at';
const SUPPLIER_DETAIL_COLS = 'id, code, name, category, instagram, photo_url, note, created_at';

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
    isFavorite: false,
    createdAt: row.created_at,
  })) as Supplier[];
}

export async function getSuppliersWithFavorites(userId: string): Promise<Supplier[]> {
  const [suppliersRes, favsRes] = await Promise.all([
    supabase.from('suppliers').select(SUPPLIER_LIST_COLS).order('created_at', { ascending: false }),
    supabase.from('supplier_favorites').select('supplier_id').eq('user_id', userId),
  ]);
  if (suppliersRes.error) throw suppliersRes.error;
  const favIds = new Set((favsRes.data ?? []).map((f: any) => f.supplier_id));
  return (suppliersRes.data as any[]).map(row => ({
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    instagram: row.instagram,
    photoUrl: row.photo_url,
    isFavorite: favIds.has(row.id),
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
    isFavorite: false,
    createdAt: data.created_at,
  };
}

export async function createSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'isFavorite'>): Promise<Supplier> {
  const { data: row, error } = await supabase
    .from('suppliers')
    .insert({
      name: data.name,
      category: data.category,
      instagram: data.instagram ?? null,
      photo_url: data.photoUrl ?? null,
      note: data.note ?? null,
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

export async function uploadBannerPhoto(file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('banners')
    .upload(path, file, { upsert: true });
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
    createdAt: row.created_at,
  })) as Client[];
}

export async function createClient(data: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
  const { data: row, error } = await supabase
    .from('clients')
    .insert({ name: data.name, email: data.email, phone: data.phone || null, active: data.active })
    .select()
    .single();
  if (error) throw error;
  return { id: row.id, name: row.name, email: row.email, phone: row.phone ?? '', active: row.active, createdAt: row.created_at };
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

// ─── App Settings (compat stub) ───────────────────────────────────────────────
export async function getAppSettings(): Promise<AppSettings> {
  return { notificationTitle: '', notificationMessage: '' };
}
export async function updateAppSettings(_updates: Partial<AppSettings>, _userId: string): Promise<void> {}
export async function getUsers() { return []; }
export async function getUserProfile(userId: string) { return getProfile(userId); }
export async function upsertUserProfile(userId: string, profile: any) { return upsertProfile(userId, profile); }
export async function uploadReceipt(_file: File, _userId: string): Promise<string> { return ''; }
