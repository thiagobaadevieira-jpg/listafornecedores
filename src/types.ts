export interface Supplier {
  id: string;
  code: number;
  name: string;
  category: string;
  instagram?: string;
  photoUrl?: string;
  note?: string;
  isFavorite?: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  color: string;
  initials: string;
  photoUrl?: string;
  role: 'admin' | 'client';
}

export interface Banner {
  id: string;
  photoUrl: string;
  link?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  createdAt: string;
}
