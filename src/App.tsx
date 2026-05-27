import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import { Plus, LayoutDashboard, List, LogOut, Search, Camera, X, ChevronDown, ChevronRight, Settings, Trash2, Menu, Edit2, AlertCircle, User as UserIcon, Instagram, Store, Heart, Users, Phone, Mail, UserCheck, UserX, Check, ArrowUp } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { User, Supplier, Client } from "@/src/types";
import { supabase } from "@/src/lib/supabase";
import * as db from "@/src/lib/db";
import type { Category } from "@/src/lib/db";

// --- Phone mask ---
function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2)  return d.replace(/(\d{1,2})/, '($1');
  if (d.length <= 6)  return d.replace(/(\d{2})(\d+)/, '($1) $2');
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 'init-1', name: "Roupas Femininas", color: "#f472b6", initials: "RF" },
  { id: 'init-2', name: "Roupas Masculinas", color: "#60a5fa", initials: "RM" },
  { id: 'init-3', name: "Infantil",          color: "#4ade80", initials: "IN" },
  { id: 'init-4', name: "Calçados",          color: "#f59e0b", initials: "CA" },
  { id: 'init-5', name: "Acessórios",        color: "#c9a55a", initials: "AC" },
  { id: 'init-6', name: "Lingerie",          color: "#f87171", initials: "LI" },
  { id: 'init-7', name: "Bolsas",            color: "#c084fc", initials: "BO" },
  { id: 'init-8', name: "Moda Praia",        color: "#22d3ee", initials: "MP" },
  { id: 'init-9', name: "Outros",            color: "#94a3b8", initials: "OU" },
];

// --- Shared Glass Components ---

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const GlassCard = ({ children, className, delay = 0 }: GlassCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={cn("glass-card", className)}
  >
    {children}
  </motion.div>
);

// --- Category Settings Modal ---

const CategorySettingsModal = ({
  isOpen,
  onClose,
  categories,
  onAdd,
  onDelete,
  onEdit
}: {
  isOpen: boolean,
  onClose: () => void,
  categories: Category[],
  onAdd: (name: string) => void,
  onDelete: (name: string) => void,
  onEdit: (oldName: string, newName: string) => void
}) => {
  const [newCatName, setNewCatName] = useState("");
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [tempEditName, setTempEditName] = useState("");
  const [catToDelete, setCatToDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newCatName.trim()) return;
    onAdd(newCatName);
    setNewCatName("");
  };

  const handleStartEdit = (catName: string) => {
    setEditingCatName(catName);
    setTempEditName(catName);
  };

  const handleSaveEdit = () => {
    if (editingCatName && tempEditName.trim() && editingCatName !== tempEditName.trim()) {
      onEdit(editingCatName, tempEditName.trim());
    }
    setEditingCatName(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div onClick={onClose} className="fixed inset-0 bg-slate-950/50 backdrop-blur-md z-[200]" />
          <div className="fixed inset-4 m-auto max-w-sm h-fit max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-none bg-[#161929]/90 backdrop-blur-2xl rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 z-[201] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black tracking-tight">Categorias</h2>
              <button 
                onClick={() => {
                  setEditingCatName(null);
                  onClose();
                }} 
                className="p-3 glass rounded-2xl hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="space-y-3 mb-8 max-h-[350px] overflow-y-auto pr-2 scrollbar-none">
              {categories.map((cat, idx) => (
                <div key={idx} className="group relative">
                  <div className={cn(
                    "flex items-center justify-between p-4 glass rounded-[24px] border border-transparent transition-all",
                    editingCatName === cat.name && "border-blue-500/30 bg-blue-500/5 shadow-lg shadow-blue-500/10"
                  )}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      
                      {editingCatName === cat.name ? (
                        <input 
                          autoFocus
                          value={tempEditName}
                          onChange={(e) => setTempEditName(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                          className="bg-transparent outline-none font-bold text-sm text-white w-full"
                        />
                      ) : (
                        <span className="text-sm font-bold truncate">{cat.name}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleStartEdit(cat.name)}
                        className="p-2 text-white/20 hover:text-blue-400 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setCatToDelete(cat.name)}
                        className="p-2 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Nova Categoria</p>
              <div className="flex gap-2">
                <input 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="Nome da categoria..."
                  className="flex-1 h-14 glass rounded-2xl px-5 outline-none focus:border-blue-500/50 transition-colors text-sm font-bold placeholder:text-white/5"
                />
                <button 
                  onClick={handleAdd}
                  className="w-14 h-14 btn-gradient rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          <ConfirmationModal 
            isOpen={!!catToDelete}
            onClose={() => setCatToDelete(null)}
            onConfirm={() => {
              onDelete(catToDelete!);
              setCatToDelete(null);
            }}
            title="Excluir Categoria?"
            message={`Tem certeza que deseja remover a categoria "${catToDelete}"? Todos os gastos vinculados a ela permanecerão, mas a categoria será removida do painel.`}
          />
        </>
      )}
    </AnimatePresence>
  );
};

// --- Clients Modal ---

const ClientsModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (isOpen) loadClients();
  }, [isOpen]);

  const loadClients = async () => {
    setLoading(true);
    const data = await db.getClients();
    setClients(data);
    setLoading(false);
  };

  const openNew = () => {
    setEditingClient(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormActive(true);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingClient(c);
    setFormName(c.name);
    setFormEmail(c.email);
    setFormPhone(formatPhone(c.phone));
    setFormActive(c.active);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError('Nome é obrigatório.'); return; }
    if (!formEmail.trim()) { setFormError('E-mail é obrigatório.'); return; }
    setFormLoading(true);
    try {
      if (editingClient) {
        await db.updateClient(editingClient.id, { name: formName.trim(), email: formEmail.trim(), phone: formPhone.trim(), active: formActive });
      } else {
        await db.createClient({ name: formName.trim(), email: formEmail.trim(), phone: formPhone.trim(), active: formActive });
      }
      setIsFormOpen(false);
      await loadClients();
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    await db.toggleClientStatus(id);
    await loadClients();
  };

  const handleDelete = async (id: string) => {
    await db.deleteClient(id);
    setConfirmDelete(null);
    await loadClients();
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const activeCount = clients.filter(c => c.active).length;
  const inactiveCount = clients.filter(c => !c.active).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-0 z-[101] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-32 max-w-2xl mx-auto w-full">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#c9a55a]/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#c9a55a]" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Clientes</h2>
                <p className="text-xs text-white/40">{clients.length} cadastrado{clients.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-lg font-black text-green-400">{activeCount}</p>
                <p className="text-[10px] text-white/40 font-medium">Ativos</p>
              </div>
            </div>
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
                <UserX className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-lg font-black text-red-400">{inactiveCount}</p>
                <p className="text-[10px] text-white/40 font-medium">Inativos</p>
              </div>
            </div>
          </div>

          {/* Search + Add */}
          <div className="flex gap-2 mb-5">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-9 pr-4 py-3 glass rounded-2xl text-sm text-white placeholder-white/30 bg-transparent outline-none border border-white/10 focus:border-[#c9a55a]/40"
              />
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-[#c9a55a] hover:bg-[#b8924a] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div className="text-center py-16 text-white/30 text-sm">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm font-medium">
                {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </p>
              {!search && (
                <button onClick={openNew} className="mt-4 text-[#c9a55a] text-sm font-bold hover:underline">
                  Cadastrar primeiro cliente
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(c => (
                <div key={c.id} className="glass rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-[#c9a55a]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-black text-[#c9a55a]">
                          {c.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white truncate">{c.name}</p>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-white/30 flex-shrink-0" />
                            <span className="text-[11px] text-white/40 truncate">{c.email}</span>
                          </div>
                          {c.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-white/30 flex-shrink-0" />
                              <span className="text-[11px] text-white/40">{c.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle status */}
                      <button
                        onClick={() => handleToggle(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                          c.active
                            ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
                            : 'bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400'
                        }`}
                        title={c.active ? 'Clique para inativar' : 'Clique para ativar'}
                      >
                        {c.active ? 'Ativo' : 'Inativo'}
                      </button>

                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-xl hover:bg-white/5 text-white/30 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setConfirmDelete(c)}
                        className="p-1.5 rounded-xl hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-white/20 mt-3">
                    Cadastrado em {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Modal (New/Edit) */}
      {isFormOpen && (
        <>
          <div className="fixed inset-0 bg-black/70 z-[110]" onClick={() => setIsFormOpen(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[111] max-w-md mx-auto bg-[#161929] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-2 rounded-xl hover:bg-white/5 text-white/40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-white/40 mb-1.5 uppercase tracking-wider">Nome *</label>
                <input
                  value={formName}
                  onChange={e => { setFormName(e.target.value); setFormError(''); }}
                  placeholder="Nome completo"
                  className="w-full px-4 py-3 glass rounded-2xl text-sm text-white placeholder-white/30 bg-transparent outline-none border border-white/10 focus:border-[#c9a55a]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/40 mb-1.5 uppercase tracking-wider">E-mail *</label>
                <input
                  value={formEmail}
                  onChange={e => { setFormEmail(e.target.value); setFormError(''); }}
                  placeholder="email@exemplo.com"
                  type="email"
                  className="w-full px-4 py-3 glass rounded-2xl text-sm text-white placeholder-white/30 bg-transparent outline-none border border-white/10 focus:border-[#c9a55a]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/40 mb-1.5 uppercase tracking-wider">Telefone</label>
                <input
                  value={formPhone}
                  onChange={e => setFormPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  type="tel"
                  className="w-full px-4 py-3 glass rounded-2xl text-sm text-white placeholder-white/30 bg-transparent outline-none border border-white/10 focus:border-[#c9a55a]/50"
                />
              </div>

              <div className="flex items-center justify-between glass rounded-2xl px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-white">Status</p>
                  <p className="text-xs text-white/40">{formActive ? 'Cliente com acesso ativo' : 'Cliente sem acesso'}</p>
                </div>
                <button
                  onClick={() => setFormActive(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${formActive ? 'bg-green-500' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${formActive ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {formError && (
                <p className="text-red-400 text-xs font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {formError}
                </p>
              )}

              <button
                onClick={handleSave}
                disabled={formLoading}
                className="w-full h-12 rounded-2xl font-bold text-sm text-white bg-[#c9a55a] hover:bg-[#b8924a] transition-colors disabled:opacity-50 mt-1"
              >
                {formLoading ? 'Salvando...' : editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/70 z-[110]" onClick={() => setConfirmDelete(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[111] max-w-sm mx-auto bg-[#161929] border border-white/10 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-black text-lg mb-2">Excluir Cliente</h3>
            <p className="text-sm text-white/50 mb-6">Tem certeza que deseja excluir <span className="text-white font-bold">{confirmDelete.name}</span>? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 h-11 rounded-2xl font-bold text-sm text-white/60 glass hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                className="flex-1 h-11 rounded-2xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

// --- Confirmation Modal ---

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void,
  title: string,
  message: string
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[300]"
          />
          <div className="fixed inset-4 m-auto max-w-sm h-fit glass rounded-[48px] p-10 z-[301] border border-red-500/20 shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-[32%] flex items-center justify-center mx-auto mb-6 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-3">{title}</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-8">{message}</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={onConfirm}
                className="w-full h-16 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/30 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
              >
                Confirmar Exclusão
              </button>
              <button 
                onClick={onClose}
                className="w-full h-16 glass text-white/40 font-black rounded-2xl hover:bg-white/5 transition-all uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// --- Profile Modal ---

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  email: string;
  onSaved: (updated: User) => void;
}

const ProfileModal = ({ isOpen, onClose, user, email, onSaved }: ProfileModalProps) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setError(null);
      // Busca telefone atual da tabela clients
      db.getClientByEmail(email).then(client => {
        setPhone(formatPhone(client?.phone ?? ''));
      });
    }
  }, [isOpen, user, email]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Informe seu nome.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const initials = (name.trim() || 'US').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      await db.upsertUserProfile(user.id, { name: name.trim(), initials });
      // Atualiza telefone na tabela clients
      const client = await db.getClientByEmail(email);
      if (client) {
        await db.updateClient(client.id, { phone: phone.trim() || '' });
      }
      onSaved({ ...user, name: name.trim(), initials });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-md z-[200]"
          />
          <div className="fixed inset-4 m-auto max-w-sm h-fit max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-none bg-[#161929]/90 backdrop-blur-2xl rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 z-[201] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black tracking-tight">Meu Perfil</h2>
              <button onClick={onClose} className="p-3 glass rounded-2xl hover:bg-white/5 transition-colors">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Nome */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Seu Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full h-14 glass rounded-2xl px-5 outline-none focus:border-blue-500/50 transition-colors text-sm font-bold placeholder:text-white/10"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Telefone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full h-14 glass rounded-2xl px-5 outline-none focus:border-blue-500/50 transition-colors text-sm font-bold placeholder:text-white/10"
                />
              </div>

              {/* Email (bloqueado) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 flex items-center gap-2">
                  <span>Email de Acesso</span>
                  <span className="text-[8px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-white/40">BLOQUEADO</span>
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full h-14 bg-white/[0.02] border border-white/5 rounded-2xl px-5 outline-none text-sm font-medium text-white/40 cursor-not-allowed"
                />
                <p className="text-[10px] text-white/30 leading-relaxed px-1">
                  Para alterar o e-mail, peça ao administrador do sistema.
                </p>
              </div>

              {error && <p className="text-red-400 text-xs font-bold px-1">{error}</p>}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-14 btn-gradient text-white font-black rounded-2xl text-sm shadow-lg active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// --- Login Screen ---

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [systemLogoUrl, setSystemLogoUrl] = useState<string | null>(null);
  const [installVideoUrl, setInstallVideoUrl] = useState<string | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    db.getSystemLogoUrl().then(setSystemLogoUrl);
    db.getInstallVideoUrl().then(setInstallVideoUrl);
  }, []);

  const handleVideoModalClose = () => {
    setIsVideoModalOpen(false);
    setVideoPlaying(false);
    if (videoRef.current) videoRef.current.pause();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const role = await db.getRoleByEmail(email.trim());
      if (!role) {
        setError('E-mail não encontrado. Verifique e tente novamente.');
        return;
      }
      if (role === 'admin') {
        setStep('password');
      } else {
        // client — login direto sem senha
        await db.clientLogin(email.trim());
      }
    } catch (err: unknown) {
      setError('Erro ao verificar e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      if (msg.includes('Invalid login')) setError('Senha incorreta.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="w-full max-w-md p-10 text-center rounded-[40px]" delay={0.2}>
        <div className="w-20 h-20 bg-black border border-white/10 rounded-full overflow-hidden flex items-center justify-center mx-auto mb-8 shadow-lg select-none">
          {systemLogoUrl
            ? <img src={systemLogoUrl} alt="Logo" className="w-full h-full object-cover" />
            : <Store className="w-10 h-10 text-[#c9a55a] stroke-[2]" />
          }
        </div>
        <h1 className="text-3xl font-bold mb-1 tracking-tighter">Bras Conect</h1>
        <p className="text-white/30 mb-10 text-xs font-bold uppercase tracking-[0.2em]">acesse sua conta</p>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="seu@email.com"
                autoFocus
                className="w-full h-14 glass rounded-2xl px-5 outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/10"
              />
            </div>
            {error && <p className="text-red-400 text-xs font-bold text-left px-1">{error}</p>}
            <button type="submit" disabled={loading || !email.trim()}
              className="w-full h-14 btn-gradient text-white font-bold rounded-2xl mt-4 text-lg disabled:opacity-50 disabled:pointer-events-none">
              {loading ? 'Verificando...' : 'Continuar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div className="text-left mb-2">
              <p className="text-xs text-white/40 mb-1">Entrando como</p>
              <p className="text-sm font-bold text-white/70 truncate">{email}</p>
              <button type="button" onClick={() => { setStep('email'); setError(null); setPassword(''); }}
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors">
                Trocar e-mail
              </button>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Chave de Segurança</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
                autoFocus
                className="w-full h-14 glass rounded-2xl px-5 outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/10"
              />
            </div>
            {error && <p className="text-red-400 text-xs font-bold text-left px-1">{error}</p>}
            <button type="submit" disabled={loading || !password.trim()}
              className="w-full h-14 btn-gradient text-white font-bold rounded-2xl mt-4 text-lg disabled:opacity-50 disabled:pointer-events-none">
              {loading ? 'Entrando...' : 'Acessar Painel'}
            </button>
          </form>
        )}

        {/* Botão "Como instalar o app" — sempre visível */}
        <button
          type="button"
          onClick={() => installVideoUrl ? setIsVideoModalOpen(true) : null}
          className={cn(
            "mt-6 w-full flex items-center justify-center gap-2.5 h-12 rounded-2xl border font-bold text-sm transition-all",
            installVideoUrl
              ? "border-[#c9a55a]/30 text-[#c9a55a] hover:bg-[#c9a55a]/10 active:scale-95 cursor-pointer"
              : "border-white/10 text-white/25 cursor-default"
          )}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
          </svg>
          Como instalar o app
        </button>
      </GlassCard>

      {/* Modal de vídeo de instalação */}
      {isVideoModalOpen && installVideoUrl && (
        <>
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300]"
            onClick={handleVideoModalClose}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[301] max-w-md mx-auto bg-[#161929] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-[#c9a55a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
                </svg>
                <p className="text-sm font-black text-white">Como instalar o app</p>
              </div>
              <button
                onClick={handleVideoModalClose}
                className="p-1.5 rounded-xl hover:bg-white/5 text-white/30 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Player de vídeo com botão pulsante */}
            <div className="bg-black relative">
              <video
                ref={videoRef}
                src={installVideoUrl}
                className="w-full max-h-[60vh] object-contain"
                controls
                playsInline
                controlsList="nodownload"
                preload="none"
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
                onEnded={() => setVideoPlaying(false)}
              />

              {/* Botão play pulsante — some quando o vídeo inicia */}
              {!videoPlaying && (
                <button
                  onClick={() => { videoRef.current?.play(); }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {/* Anel pulsante externo */}
                  <span className="absolute w-20 h-20 rounded-full animate-ping opacity-30" style={{ background: '#c9a55a' }} />
                  {/* Anel médio */}
                  <span className="absolute w-16 h-16 rounded-full opacity-50" style={{ background: '#c9a55a' }} />
                  {/* Botão play central */}
                  <span className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl" style={{ background: '#c9a55a' }}>
                    <svg className="w-6 h-6 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Banner Carousel ──────────────────────────────────────────────────────────

const BannerGrid = ({ banners }: { banners: import('./types').Banner[] }) => {
  if (banners.length === 0) return null;

  const [first, ...rest] = banners;

  return (
    <div className="w-full flex flex-col gap-3 overflow-hidden">
      {/* Primeiro banner — largura total 16:9 */}
      <motion.div
        key={first.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        onClick={() => { if (first.link) window.open(first.link, '_blank', 'noreferrer'); }}
        className={cn("w-full relative aspect-video overflow-hidden rounded-[20px]", first.link ? 'cursor-pointer active:scale-[0.98] transition-transform' : '')}
      >
        <img src={first.photoUrl} alt="banner 1" className="w-full h-full object-cover" />
      </motion.div>

      {/* Demais banners — grade 2 por linha, 1:1 */}
      {rest.length > 0 && (
        <div className="w-full grid grid-cols-2 gap-3">
          {rest.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              onClick={() => { if (b.link) window.open(b.link, '_blank', 'noreferrer'); }}
              className={cn("relative aspect-square overflow-hidden rounded-[16px]", b.link ? 'cursor-pointer active:scale-[0.97] transition-transform' : '')}
            >
              <img src={b.photoUrl} alt={`banner ${i + 2}`} className="w-full h-full object-cover" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Banner Settings Modal ────────────────────────────────────────────────────

const BannerSettingsModal = ({ isOpen, onClose, banners, onRefresh }: {
  isOpen: boolean;
  onClose: () => void;
  banners: import('./types').Banner[];
  onRefresh: () => void;
}) => {
  const [link, setLink] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setUploadError('Imagem muito grande. Máximo 8 MB.'); return; }
    setUploading(true);
    setUploadError(null);
    try {
      const url = await db.uploadBannerPhoto(file);
      setPhotoUrl(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Erro ao fazer upload:', err);
      setUploadError(`Erro ao enviar: ${msg}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!photoUrl) return;
    if (editingId) {
      await db.updateBanner(editingId, { photoUrl, link: link.trim() || undefined });
    } else {
      await db.createBanner({ photoUrl, link: link.trim() || undefined });
    }
    setPhotoUrl(''); setLink(''); setEditingId(null);
    onRefresh();
  };

  const handleEdit = (b: import('./types').Banner) => {
    setEditingId(b.id); setPhotoUrl(b.photoUrl); setLink(b.link ?? '');
  };

  const handleDelete = async (id: string) => {
    await db.deleteBanner(id);
    if (editingId === id) { setEditingId(null); setPhotoUrl(''); setLink(''); }
    onRefresh();
  };

  const fieldClass = "w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors";

  return (
    <>
      {isOpen && (
        <>
          <div onClick={onClose} className="fixed inset-0 bg-slate-950/50 backdrop-blur-md z-[200]" />
          <div className="fixed inset-4 m-auto max-w-sm h-fit max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-none bg-[#161929]/90 backdrop-blur-2xl rounded-[32px] p-6 z-[201] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black tracking-tight">Banners</h2>
              <button onClick={onClose} className="p-2.5 glass rounded-2xl hover:bg-white/5 transition-colors">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>

            {/* Banners existentes */}
            {banners.length > 0 && (
              <div className="space-y-3 mb-6">
                {banners.map((b, i) => (
                  <div key={b.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                    <img src={b.photoUrl} alt={`banner ${i+1}`} className="w-16 h-10 object-cover rounded-xl shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white/70">Banner {i + 1}</p>
                      {b.link && <p className="text-[10px] text-white/30 truncate">{b.link}</p>}
                    </div>
                    <button onClick={() => handleEdit(b)} className="p-2 glass rounded-xl hover:bg-white/10 transition-colors">
                      <Edit2 className="w-3.5 h-3.5 text-white/40" />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="p-2 glass rounded-xl hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-white/40" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário adicionar/editar */}
            <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  {editingId ? 'Editar Banner' : `Novo Banner (${banners.length} cadastrado${banners.length !== 1 ? 's' : ''})`}
                </p>

                {/* Upload foto */}
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="relative w-full h-32 rounded-2xl overflow-hidden border-2 border-dashed border-white/15 hover:border-white/30 transition-colors flex flex-col items-center justify-center gap-2"
                  style={{ background: photoUrl ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
                  {uploading ? (
                    <><div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /><span className="text-xs text-white/30 font-bold">Enviando...</span></>
                  ) : photoUrl ? (
                    <img src={photoUrl} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-white/20" />
                      <span className="text-xs text-white/30 font-bold">Clique para adicionar foto</span>
                    </>
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*,image/avif,.avif" className="hidden" onChange={handlePhoto} />

                {uploadError && (
                  <p className="text-red-400 text-xs font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
                  </p>
                )}

                {/* Link */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Link (opcional)</label>
                  <input value={link} onChange={e => setLink(e.target.value)}
                    placeholder="https://instagram.com/loja" className={fieldClass} />
                </div>

                <div className="flex gap-2">
                  {editingId && (
                    <button type="button" onClick={() => { setEditingId(null); setPhotoUrl(''); setLink(''); }}
                      className="flex-1 h-11 glass rounded-2xl text-sm font-bold text-white/40 hover:bg-white/5 transition-colors">
                      Cancelar
                    </button>
                  )}
                  <button type="button" onClick={handleSave} disabled={!photoUrl}
                    className="flex-1 h-11 btn-gradient rounded-2xl text-sm font-bold disabled:opacity-40 transition-opacity">
                    {editingId ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

// ─── Supplier Form ────────────────────────────────────────────────────────────

const SupplierForm = ({ initial, categories, onClose, onSave, onDelete }: {
  initial: Supplier | null;
  categories: { name: string; color: string }[];
  onClose: () => void;
  onSave: (data: Omit<Supplier, 'id' | 'createdAt'>, photoFile?: File) => Promise<void>;
  onDelete?: () => Promise<void>;
}) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? (categories[0]?.name ?? ''));
  const [instagram, setInstagram] = useState(initial?.instagram ?? '');
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? '');
  const [photoFile, setPhotoFile] = useState<File | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [isCatOpen, setIsCatOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fieldClass = "w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors";

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert('Imagem muito grande. Máximo 8 MB.'); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      category,
      instagram: instagram.trim().replace('@', '') || undefined,
      photoUrl: photoUrl || undefined,
    }, photoFile);
    setSaving(false);
  };

  const avatarColor = categories.find(c => c.name === category)?.color ?? '#94a3b8';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight">{initial ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
        <button onClick={onClose} className="p-2.5 glass rounded-2xl hover:bg-white/5 transition-colors">
          <X className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Foto */}
      <div className="flex flex-col items-center gap-3">
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="relative w-32 h-32 rounded-3xl overflow-hidden group border-2 border-dashed border-white/15 hover:border-white/30 transition-colors"
          style={{ background: photoUrl ? 'transparent' : `${avatarColor}15` }}>
          {photoUrl ? (
            <img src={photoUrl} alt="foto" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Camera className="w-8 h-8" style={{ color: avatarColor }} />
              <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Foto</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </button>
        {photoUrl && (
          <button type="button" onClick={() => setPhotoUrl('')}
            className="text-[10px] font-bold text-white/30 hover:text-red-400 transition-colors uppercase tracking-wider">
            Remover foto
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Nome da Loja</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Moda Bella" className={fieldClass} />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Categoria</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCatOpen(v => !v)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-sm text-left flex items-center justify-between outline-none focus:border-white/20 transition-colors"
            >
              <span className={category ? 'text-white' : 'text-white/20'}>
                {category || 'Selecione a categoria'}
              </span>
              <ChevronDown className={`w-4 h-4 text-white/30 transition-transform duration-200 ${isCatOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCatOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsCatOpen(false)} />
                <div className="absolute left-0 right-0 mt-2 p-1.5 bg-[#161929] border border-white/10 rounded-2xl shadow-2xl z-20 flex flex-col gap-0.5 max-h-52 overflow-y-auto">
                  {categories.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => { setCategory(c.name); setIsCatOpen(false); }}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-all flex items-center gap-3 ${category === c.name ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Instagram</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm font-bold">@</span>
            <input value={instagram} onChange={e => setInstagram(e.target.value.replace('@', ''))}
              placeholder="usuario" className={cn(fieldClass, "pl-8")} />
          </div>
        </div>

      </div>

      <button onClick={handleSave} disabled={!name.trim() || saving}
        className="w-full h-12 btn-gradient rounded-2xl font-bold text-sm tracking-wide disabled:opacity-40 transition-opacity active:scale-[0.98]">
        {saving ? 'Salvando...' : initial ? 'Salvar Alterações' : 'Adicionar Fornecedor'}
      </button>
      {initial && onDelete && (
        <button type="button" onClick={onDelete}
          className="w-full h-12 rounded-2xl font-bold text-sm tracking-wide text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
          <Trash2 className="w-4 h-4" />
          Excluir Fornecedor
        </button>
      )}
    </div>
  );
};

const SystemConfigModal = ({
  currentLogoUrl,
  onClose,
  onSaved,
}: {
  currentLogoUrl: string | null;
  onClose: () => void;
  onSaved: (url: string | null) => void;
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video install
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.getInstallVideoUrl().then(setVideoUrl);
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError('Imagem muito grande. Máximo 8 MB.'); return; }
    setUploading(true);
    setError(null);
    try {
      const url = await db.uploadSystemLogo(file);
      setLogoUrl(url);
    } catch (err) {
      setError('Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) { setVideoError('Vídeo muito grande. Máximo 200 MB.'); return; }
    setVideoUploading(true);
    setVideoError(null);
    try {
      const url = await db.uploadInstallVideo(file);
      await db.setInstallVideoUrl(url);
      setVideoUrl(url);
    } catch (err) {
      setVideoError('Erro ao enviar vídeo. Verifique o tamanho e tente novamente.');
    } finally {
      setVideoUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await db.setSystemLogoUrl(logoUrl);
      onSaved(logoUrl);
      onClose();
    } catch (err) {
      setError('Erro ao salvar configuração.');
    } finally {
      setSaving(false);
    }
  };


  const handleRemove = () => setLogoUrl(null);

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[110]" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[111] max-w-md mx-auto bg-[#161929] border border-white/10 rounded-3xl p-6 shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black">Configuração do Sistema</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Logo */}
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Logo do Sistema</p>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: '#151c2c' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                    <defs>
                      <linearGradient id="pgold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e8c97a" />
                        <stop offset="100%" stopColor="#a07830" />
                      </linearGradient>
                    </defs>
                    <path d="M17 18 Q17 10 24 10 Q31 10 31 18" stroke="url(#pgold)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    <text x="7" y="44" fontFamily="Georgia,serif" fontWeight="900" fontSize="40" fill="url(#pgold)">B</text>
                  </svg>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-10 px-4 glass rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enviando...</>
                  ) : (
                    <><Camera className="w-4 h-4" />Escolher imagem</>
                  )}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="h-10 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 transition-all"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <p className="text-[11px] text-white/20">PNG, JPG ou WEBP. Aparecerá no canto superior esquerdo.</p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="w-full h-12 btn-gradient rounded-2xl font-bold text-sm tracking-wide disabled:opacity-40 transition-opacity active:scale-[0.98]"
          >
            {saving ? 'Salvando...' : 'Salvar Logo'}
          </button>

          {/* Divisor */}
          <div className="border-t border-white/5" />

          {/* Vídeo de instalação */}
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Vídeo "Como Instalar o App"</p>
            <p className="text-[11px] text-white/20 mb-4">Aparece como botão na tela de login. Formatos: MP4, MOV, WEBM. O vídeo é salvo automaticamente após o envio.</p>

            {/* Preview do vídeo atual */}
            {videoUrl && !videoUploading && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 bg-black/30">
                <video
                  src={videoUrl}
                  className="w-full max-h-40 object-contain"
                  controls
                  preload="metadata"
                />
                <div className="px-3 py-2 flex items-center justify-between">
                  <p className="text-[10px] text-white/30 font-medium">Vídeo atual</p>
                  <button
                    type="button"
                    onClick={async () => { setVideoUrl(null); await db.setInstallVideoUrl(null); }}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              </div>
            )}

            {/* Upload */}
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={videoUploading}
              className="w-full h-14 glass rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
            >
              {videoUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span className="text-sm font-bold text-white/50">Enviando vídeo...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                  </svg>
                  <span className="text-sm font-bold text-white/40">{videoUrl ? 'Trocar vídeo' : 'Escolher vídeo'}</span>
                </>
              )}
            </button>
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFile} />

            {videoError && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {videoError}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const DashboardScreen = ({ user, onLogout, onProfileUpdate }: { user: User, onLogout: () => void, onProfileUpdate: (u: User) => void }) => {
  const isAdmin = user.role === 'admin';
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [banners, setBanners] = useState<import('./types').Banner[]>([]);
  const [isBannerSettingsOpen, setIsBannerSettingsOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadData = () => {
    setDataLoading(true);
    setDataError(null);
    Promise.all([
      db.getSuppliersWithFavorites(user.id),
      db.getBanners(),
      db.getCategories(),
    ])
      .then(([supps, bans, cats]) => {
        setSuppliers(supps);
        setBanners(bans);
        setCategories(cats.length ? cats : INITIAL_CATEGORIES);
      })
      .catch((err) => {
        console.error(err);
        setDataError('Não foi possível carregar os dados. Verifique sua conexão.');
      })
      .finally(() => setDataLoading(false));
  };

  useEffect(() => { loadData(); }, [user.id]);
  useEffect(() => { db.getSystemLogoUrl().then(setSystemLogoUrl); }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isClientsOpen, setIsClientsOpen] = useState(false);
  const [isSystemConfigOpen, setIsSystemConfigOpen] = useState(false);
  const [systemLogoUrl, setSystemLogoUrl] = useState<string | null>(null);
  const [view, setView] = useState<'overview' | 'list' | 'favorites'>('overview');

  const handleAddCategory = async (name: string) => {
    if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) return;
    const colors = ["#f87171", "#60a5fa", "#c084fc", "#4ade80", "#fbbf24", "#f472b6", "#2dd4bf", "#fb923c"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newCat = { name, color: randomColor, initials: name.substring(0, 2).toUpperCase() };
    const created = await db.createCategory(newCat);
    setCategories(prev => [...prev, created]);
  };

  const handleEditCategory = async (oldName: string, newName: string) => {
    if (categories.find(c => c.name.toLowerCase() === newName.toLowerCase())) return;
    const cat = categories.find(c => c.name === oldName);
    if (!cat?.id) return;
    const updatedInitials = newName.substring(0, 2).toUpperCase();
    await db.updateCategory(cat.id, { name: newName, initials: updatedInitials });
    setCategories(prev => prev.map(c => c.name === oldName ? { ...c, name: newName, initials: updatedInitials } : c));
  };

  const handleDeleteCategory = async (name: string) => {
    const cat = categories.find(c => c.name === name);
    if (!cat?.id) return;
    await db.deleteCategory(cat.id);
    setCategories(prev => prev.filter(c => c.name !== name));
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [scrolled, setScrolled] = useState(false);
  const [loadedPhotos, setLoadedPhotos] = useState<Set<string>>(new Set());

  // Reset visibleCount when filter/search/view changes
  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, selectedCategoryFilter, view]);

  // Load more + track scroll — usa ref para evitar re-renders desnecessários
  const scrolledRef = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 60;
      if (isScrolled !== scrolledRef.current) {
        scrolledRef.current = isScrolled;
        setScrolled(isScrolled);
      }
      const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 400;
      if (nearBottom) setVisibleCount(n => n + 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Suppliers filtrados e visíveis
  const filteredSuppliers = useMemo(() => suppliers.filter(s => {
    if (view === 'favorites') return !!s.isFavorite;
    const matchCat = selectedCategoryFilter === "all" || s.category === selectedCategoryFilter;
    const codeStr = String(s.code).padStart(3, '0');
    const q = searchQuery.toLowerCase().replace(/^#/, '');
    const matchSearch = !searchQuery || s.name.toLowerCase().includes(q) || s.instagram?.toLowerCase().includes(q) || codeStr.includes(q);
    return matchCat && matchSearch;
  }), [suppliers, view, selectedCategoryFilter, searchQuery]);

  const visibleSuppliers = useMemo(() => filteredSuppliers.slice(0, visibleCount), [filteredSuppliers, visibleCount]);

  // Pré-carrega fotos em useEffect (fora do render) para evitar re-renders em cascata
  useEffect(() => {
    visibleSuppliers.forEach(s => {
      if (!s.photoUrl || loadedPhotos.has(s.id)) return;
      const img = new Image();
      img.onload = () => setLoadedPhotos(prev => { const n = new Set(prev); n.add(s.id); return n; });
      img.onerror = () => setLoadedPhotos(prev => { const n = new Set(prev); n.add(s.id); return n; });
      img.src = s.photoUrl;
    });
  }, [visibleSuppliers]);

  // ─── Early returns AFTER all hooks ───────────────────────────────────────────
  if (dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Carregando dados...</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="text-center space-y-2">
          <p className="font-bold text-white">{dataError}</p>
          <p className="text-white/40 text-sm">Tente novamente ou verifique as configurações do Supabase.</p>
        </div>
        <button
          onClick={loadData}
          className="h-12 px-8 btn-gradient rounded-2xl font-bold text-sm text-white active:scale-95 transition-all"
        >
          Tentar Novamente
        </button>
        <button onClick={onLogout} className="text-xs text-white/30 hover:text-white/60 transition-colors font-bold">
          Sair da Conta
        </button>
      </div>
    );
  }

  return (
    <div className="pb-32 pt-0 min-h-screen">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 glass border-b border-white/5 px-6 py-5 flex items-center justify-between z-[80] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-lg select-none" style={{ background: '#151c2c' }}>
            {systemLogoUrl ? (
              <img src={systemLogoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="hgold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e8c97a" />
                    <stop offset="100%" stopColor="#a07830" />
                  </linearGradient>
                </defs>
                <path d="M17 18 Q17 10 24 10 Q31 10 31 18" stroke="url(#hgold)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <text x="7" y="44" fontFamily="Georgia,serif" fontWeight="900" fontSize="40" fill="url(#hgold)">B</text>
              </svg>
            )}
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Bras Conect</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative" ref={menuRef}>
          <button 
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2.5 glass rounded-xl hover:bg-white/5 transition-colors group"
          >
            <Menu className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
          </button>

          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-3 w-56 bg-[#161929]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-[90] overflow-hidden">
              <button
                onClick={() => { setIsProfileOpen(true); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-sm font-bold text-white/60 hover:text-blue-400 text-left"
              >
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="" className="w-5 h-5 rounded-full object-cover border border-white/10" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
                <span>Perfil</span>
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-sm font-bold text-white/60 hover:text-blue-400 text-left"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Categorias</span>
                  </button>

                  <button
                    onClick={() => { setIsBannerSettingsOpen(true); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-sm font-bold text-white/60 hover:text-yellow-400 text-left"
                  >
                    <Store className="w-4 h-4" />
                    <span>Banners</span>
                  </button>

                  <button
                    onClick={() => { setIsClientsOpen(true); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-sm font-bold text-white/60 hover:text-[#c9a55a] text-left"
                  >
                    <Users className="w-4 h-4" />
                    <span>Clientes</span>
                  </button>
                </>
              )}

              {isAdmin && (
                <button
                  onClick={() => { setIsSystemConfigOpen(true); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-sm font-bold text-white/60 hover:text-white text-left"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configuração do Sistema</span>
                </button>
              )}
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-sm font-bold text-white/60 hover:text-red-400 text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Conta</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-28">
        {/* View Switcher Refined */}
        <div className="flex p-1 sm:p-1.5 glass rounded-2xl mb-10 z-[70]">
          <button
            onClick={() => setView('overview')}
            className={cn(
              "flex-1 py-2.5 px-2 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all",
              view === 'overview' ? "bg-white/10 text-white shadow-xl" : "text-white/40 hover:text-white/60"
            )}
          >
            <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">Início</span>
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              "flex-1 py-2.5 px-2 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all",
              view === 'list' ? "bg-white/10 text-white shadow-xl" : "text-white/40 hover:text-white/60"
            )}
          >
            <List className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">Fornecedores</span>
          </button>
          <button
            onClick={() => setView('favorites')}
            className={cn(
              "flex-1 py-2.5 px-2 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all",
              view === 'favorites' ? "bg-white/10 text-white shadow-xl" : "text-white/40 hover:text-white/60"
            )}
          >
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">Favoritos</span>
          </button>
        </div>

        <>
          {view === 'overview' ? (
            <div className="space-y-6"
            >
              <BannerGrid banners={banners} />
            </div>
          ) : (
            <div className="space-y-6"
            >
              {/* Search/Filter Container */}
              {view !== 'favorites' && (
              <div className="space-y-3 z-[60] bg-[#0a0d1a] pb-3">
                <div className="flex items-center">
                  <div className="flex-1 h-11 glass rounded-2xl flex items-center px-4 focus-within:border-white/20 transition-colors shadow-inner">
                    <Search className="w-4 h-4 text-white/20 mr-3 shrink-0" />
                    <input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                      placeholder="Buscar fornecedor..."
                      className="bg-transparent outline-none flex-1 text-sm font-medium placeholder:text-white/20"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest pl-2 shrink-0"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* Category selector */}
                <button
                  type="button"
                  onClick={() => setIsCategoryFilterOpen(v => !v)}
                  className="w-full h-12 glass rounded-[20px] px-5 flex items-center justify-between text-sm font-medium transition-colors"
                >
                  <span className={selectedCategoryFilter === 'all' ? 'text-white/30' : 'text-white/80'}>
                    {selectedCategoryFilter === 'all' ? 'Selecione a categoria' : selectedCategoryFilter}
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedCategoryFilter !== 'all' && (
                      <span
                        onClick={e => { e.stopPropagation(); setSelectedCategoryFilter('all'); }}
                        className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg"
                      >
                        Limpar
                      </span>
                    )}
                    <ChevronDown className="w-4 h-4 text-white/30" />
                  </div>
                </button>

                {/* Modal de categorias */}
                {isCategoryFilterOpen && (
                  <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]" onClick={() => setIsCategoryFilterOpen(false)} />
                    <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[151] max-w-sm mx-auto bg-[#161929] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <p className="text-sm font-black uppercase tracking-widest text-white/50">Categoria</p>
                        <button onClick={() => setIsCategoryFilterOpen(false)} className="p-1.5 rounded-xl hover:bg-white/5 text-white/30">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="overflow-y-auto overscroll-contain max-h-[60vh] p-2">
                        <button
                          type="button"
                          onClick={() => { setSelectedCategoryFilter('all'); setIsCategoryFilterOpen(false); }}
                          className={`w-full px-4 py-3 rounded-xl text-sm font-medium text-left transition-all ${selectedCategoryFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}
                        >
                          Todas as categorias
                        </button>
                        {categories.map(c => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => { setSelectedCategoryFilter(c.name); setIsCategoryFilterOpen(false); }}
                            className={`w-full px-4 py-3 rounded-xl text-sm font-medium text-left transition-all flex items-center gap-3 ${selectedCategoryFilter === c.name ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}
                          >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#c9a55a' }} />
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              )}

              {/* Lista de Fornecedores */}
              <div className="space-y-3">
                {(() => {
                  const filtered = filteredSuppliers;
                  const visible = visibleSuppliers;

                  if (filtered.length === 0) return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="p-10 text-center glass rounded-[32px] border border-white/5 space-y-4">
                      {view === 'favorites' ? (
                        <Heart className="w-8 h-8 text-white/10 mx-auto" />
                      ) : (
                        <Store className="w-8 h-8 text-white/10 mx-auto" />
                      )}
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white/50">
                          {view === 'favorites' ? 'Nenhum favorito ainda' : 'Nenhum fornecedor encontrado'}
                        </p>
                        <p className="text-[10px] text-white/20 px-4 leading-relaxed font-medium">
                          {view === 'favorites' ? 'Toque no coração de um fornecedor para favoritar.' : 'Tente ajustar a busca ou o filtro de categoria.'}
                        </p>
                      </div>
                      {view !== 'favorites' && (selectedCategoryFilter !== "all" || searchQuery !== "") && (
                        <button type="button" onClick={() => { setSearchQuery(""); setSelectedCategoryFilter("all"); }}
                          className="mx-auto text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 px-5 h-10 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer">
                          Limpar Filtros
                        </button>
                      )}
                    </motion.div>
                  );

                  // Mostra em ordem: só avança para o próximo quando o anterior já apareceu
                  let displayCount = 0;
                  for (const s of visible) {
                    if (!s.photoUrl || loadedPhotos.has(s.id)) displayCount++;
                    else break;
                  }
                  const readySuppliers = visible.slice(0, displayCount);

                  return (<>
                  {readySuppliers.map((supplier) => {
                    const GOLD = '#c9a55a';
                    return (
                      <div key={supplier.id}
                        onClick={async () => {
                          if (!isAdmin) return; // clientes não abrem modal
                          const detail = await db.getSupplierDetail(supplier.id);
                          setEditingSupplier(detail ?? supplier);
                          setIsSupplierModalOpen(true);
                        }}
                        className={cn("interactive-glass rounded-[24px] sm:rounded-[32px] pt-3 pr-3 pl-3 pb-5 sm:p-7 flex items-center gap-3 sm:gap-5 group", isAdmin ? "cursor-pointer" : "cursor-default")}
                      >
                        {/* Avatar / foto */}
                        {supplier.photoUrl ? (
                          <img src={supplier.photoUrl} alt={supplier.name}
                            className="w-16 h-16 sm:w-[90px] sm:h-[90px] rounded-full object-cover shrink-0 border-2 border-white/20" />
                        ) : (
                          <div className="w-16 h-16 sm:w-[90px] sm:h-[90px] rounded-full shrink-0 flex items-center justify-center text-xl sm:text-2xl font-black"
                            style={{ background: 'rgba(201,165,90,0.15)', color: GOLD }}>
                            {supplier.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                          </div>
                        )}

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-base sm:text-lg leading-tight" style={{ color: GOLD }}>{supplier.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                            <p className="text-xs text-white/40 font-black uppercase tracking-widest">{supplier.category}</p>
                          </div>
                          <p className="text-[10px] font-bold mt-1.5" style={{ color: 'rgba(201,165,90,0.45)' }}>
                            #{String(supplier.code).padStart(3, '0')}
                          </p>
                        </div>

                        {/* Ações — empilhadas verticalmente à direita */}
                        <div className="flex flex-col items-center gap-3 shrink-0">
                          <button
                            onClick={async e => { e.stopPropagation(); await db.toggleFavoriteSupplier(supplier.id, user.id, !!supplier.isFavorite); setSuppliers(await db.getSuppliersWithFavorites(user.id)); }}
                            className="w-9 h-9 rounded-2xl flex items-center justify-center transition-colors"
                            style={{ background: supplier.isFavorite ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)' }}>
                            <Heart
                              className="w-5 h-5 transition-colors"
                              style={{ color: supplier.isFavorite ? '#ef4444' : 'rgba(255,255,255,0.2)' }}
                              fill={supplier.isFavorite ? '#ef4444' : 'none'}
                            />
                          </button>
                          {supplier.instagram && (
                            <a href={`https://instagram.com/${supplier.instagram.replace('@','')}`}
                              target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="w-9 h-9 rounded-2xl flex items-center justify-center transition-colors"
                              style={{ background: 'rgba(201,165,90,0.12)' }}>
                              <Instagram className="w-5 h-5" style={{ color: GOLD }} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </>);
                })()}
              </div>
            </div>
          )}
        </>
      </div>

      {/* Floating Action Button — apenas admin */}
      {isAdmin && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => { setEditingSupplier(null); setIsSupplierModalOpen(true); }}
          className="fixed bottom-8 right-8 w-16 h-16 btn-gradient rounded-full flex items-center justify-center shadow-[0_15px_30px_-5px_rgba(59,130,246,0.6)] z-[90] active:scale-95 transition-all"
        >
          <Plus className="w-8 h-8 text-white stroke-[3]" />
        </motion.button>
      )}

      {/* Scroll to top */}
      {scrolled && (
        <button
          onClick={() => window.scrollTo(0, 0)}
          className={cn("fixed right-8 w-11 h-11 rounded-full glass border border-white/10 flex items-center justify-center shadow-lg z-[90] active:scale-95 transition-all", isAdmin ? "bottom-[13rem]" : "bottom-[7rem]")}
        >
          <ArrowUp className="w-5 h-5 text-white/60" />
        </button>
      )}

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/5547996077623"
        target="_blank"
        rel="noreferrer"
        className={cn("fixed right-8 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(37,211,102,0.6)] z-[90] active:scale-95 transition-all", isAdmin ? "bottom-28" : "bottom-8")}
        style={{ background: '#25D366' }}
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      {/* Clients Modal */}
      <ClientsModal
        isOpen={isClientsOpen}
        onClose={() => setIsClientsOpen(false)}
      />

      {/* System Config Modal */}
      {isSystemConfigOpen && (
        <SystemConfigModal
          currentLogoUrl={systemLogoUrl}
          onClose={() => setIsSystemConfigOpen(false)}
          onSaved={(url) => setSystemLogoUrl(url)}
        />
      )}

      {/* Banner Settings Modal */}
      <BannerSettingsModal
        isOpen={isBannerSettingsOpen}
        onClose={() => setIsBannerSettingsOpen(false)}
        banners={banners}
        onRefresh={() => db.getBanners().then(setBanners)}
      />

      {/* Supplier Modal */}
      <>
        {isSupplierModalOpen && (
          <>
            <div
              onClick={() => { setIsSupplierModalOpen(false); setEditingSupplier(null); }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200]" />
            <div className="fixed inset-4 m-auto max-w-sm h-fit max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-none bg-[#161929]/90 backdrop-blur-2xl rounded-[32px] p-6 z-[201] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]">
              <SupplierForm
                initial={editingSupplier}
                categories={categories}
                onClose={() => { setIsSupplierModalOpen(false); setEditingSupplier(null); }}
                onSave={async (data, photoFile) => {
                  let finalPhotoUrl = data.photoUrl;
                  if (photoFile) {
                    finalPhotoUrl = await db.uploadSupplierPhoto(photoFile);
                  }
                  const finalData = { ...data, photoUrl: finalPhotoUrl };
                  if (editingSupplier) {
                    await db.updateSupplier(editingSupplier.id, finalData);
                  } else {
                    await db.createSupplier(finalData);
                  }
                  setSuppliers(await db.getSuppliersWithFavorites(user.id));
                  setIsSupplierModalOpen(false);
                  setEditingSupplier(null);
                }}
                onDelete={editingSupplier ? async () => {
                  await db.deleteSupplier(editingSupplier.id);
                  setSuppliers(await db.getSuppliersWithFavorites(user.id));
                  setIsSupplierModalOpen(false);
                  setEditingSupplier(null);
                } : undefined}
              />
            </div>
          </>
        )}
      </>

      <CategorySettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        categories={categories}
        onAdd={handleAddCategory}
        onDelete={handleDeleteCategory}
        onEdit={handleEditCategory}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        email={user.email}
        onSaved={(updated) => { onProfileUpdate(updated); }}
      />
    </div>
  );
};

// --- Main App Entry ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  async function loadUserProfile(userId: string, sessionEmail: string = ''): Promise<User> {
    const profile = await db.getProfile(userId);
    if (profile) {
      return {
        id: profile.id,
        name: profile.name || sessionEmail.split('@')[0],
        email: sessionEmail,
        color: profile.color,
        initials: profile.initials || sessionEmail.slice(0, 2).toUpperCase(),
        photoUrl: profile.photo_url ?? undefined,
        role: profile.role,
      };
    }
    return { id: userId, name: sessionEmail.split('@')[0], email: sessionEmail, color: '#c9a55a', initials: sessionEmail.slice(0, 2).toUpperCase(), role: 'client' };
  }

  useEffect(() => {
    // Timeout de segurança: se o Supabase não responder em 5s, vai para login
    const timeout = setTimeout(() => setAuthLoading(false), 5000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      if (session?.user) {
        const profile = await loadUserProfile(session.user.id, session.user.email ?? '');
        setCurrentUser(profile);
      }
      setAuthLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // CRÍTICO: nunca fazer queries Supabase DIRETO no callback — causa deadlock.
      // O signInWithPassword retém o lock interno de auth e espera este callback
      // terminar antes de prosseguir. Se fizermos uma query aqui, ela trava esperando
      // o mesmo lock. Solução: deferir para fora do callback com setTimeout(fn, 0).
      if (session?.user) {
        // Set imediato de fallback para tirar a tela de login
        const fallbackUser: User = {
          id: session.user.id,
          name: session.user.email?.split('@')[0] ?? 'Usuário',
          email: session.user.email ?? '',
          color: '#c9a55a',
          initials: (session.user.email ?? 'US').slice(0, 2).toUpperCase(),
          role: 'client',
        };
        setCurrentUser(fallbackUser);

        // Depois, fora do lock, busca o perfil completo
        setTimeout(async () => {
          try {
            const profile = await loadUserProfile(session.user.id, session.user.email ?? '');
            setCurrentUser(profile);
          } catch (err) {
            console.error('Falha ao carregar perfil:', err);
          }
        }, 0);
      } else {
        setCurrentUser(null);
      }
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <AnimatePresence mode="wait">
        {!currentUser ? (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoginScreen />
          </motion.div>
        ) : (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DashboardScreen user={currentUser} onLogout={() => supabase.auth.signOut()} onProfileUpdate={setCurrentUser} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
