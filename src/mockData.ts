import { User, Expense, Supplier } from "./types";

export const MOCK_USERS: User[] = [
  { id: "1", name: "Thiago Vieira", email: "thiago@example.com", color: "#3b82f6", initials: "TV" },
  { id: "2", name: "Ana Costa", email: "ana@example.com", color: "#10b981", initials: "AC" },
  { id: "3", name: "Lucas Silva", email: "lucas@example.com", color: "#f59e0b", initials: "LS" },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: "s1", name: "Moda Bella", category: "Roupas Femininas", instagram: "modabella.bras", address: "Rua Oriente, 456 - Brás, SP", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "s2", name: "Baby Kids Store", category: "Infantil", instagram: "babykidsbras", address: "Rua Silva Pinto, 789 - Brás, SP", createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "s3", name: "Calçados Premium", category: "Calçados", instagram: "calcadospremium", address: "Rua Couto de Magalhães, 123 - Brás, SP", createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: "s4", name: "Fashion Man", category: "Roupas Masculinas", instagram: "fashionmanbras", address: "Av. Rangel Pestana, 654 - Brás, SP", createdAt: new Date(Date.now() - 345600000).toISOString() },
  { id: "s5", name: "Acessórios Gold", category: "Acessórios", instagram: "acessoriosgold", address: "Rua do Gasômetro, 321 - Brás, SP", createdAt: new Date(Date.now() - 432000000).toISOString() },
];

export const MOCK_EXPENSES: Expense[] = [
  { id: "101", userId: "1", category: "Alimentação", name: "Almoço Equipe", value: 125.50, note: "Restaurante Central", createdAt: new Date().toISOString() },
  { id: "102", userId: "2", category: "Transporte", name: "Uber Escritório", value: 45.20, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "103", userId: "3", category: "Escritório", name: "Papelaria", value: 89.90, note: "Canetas e blocos", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "104", userId: "1", category: "Alimentação", name: "Café", value: 12.00, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "105", userId: "2", category: "Assinaturas", name: "Assinatura Adobe", value: 230.00, note: "Mensalidade", createdAt: new Date(Date.now() - 259200000).toISOString() },
];
