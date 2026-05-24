export interface User {
  id: string;
  name: string;
  email: string;
  color: string;
  initials: string;
  photoUrl?: string;
}

export interface Expense {
  id: string;
  userId: string;
  category: string;
  name: string;
  value: number;
  note?: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface UserStats {
  userId: string;
  userName: string;
  total: number;
  color: string;
}
