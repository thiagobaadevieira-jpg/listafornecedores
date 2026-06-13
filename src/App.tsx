import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, startTransition } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import { Plus, LayoutDashboard, List, LogOut, Search, Camera, X, ChevronDown, ChevronRight, Settings, Trash2, Menu, Edit2, AlertCircle, User as UserIcon, Instagram, Store, Heart, Users, Phone, Mail, UserCheck, UserX, Check, ArrowUp, Bell, Send, Lock, LockOpen } from "lucide-react";
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

// --- Supplier Skeleton Card ---
const SupplierSkeleton = () => (
  <div className="interactive-glass rounded-[24px] sm:rounded-[32px] pt-3 pr-3 pl-3 pb-5 sm:p-7 flex items-center gap-3 sm:gap-5">
    <div className="w-16 h-16 sm:w-[90px] sm:h-[90px] rounded-full shrink-0 skeleton-shimmer" />
    <div className="min-w-0 flex-1 space-y-2">
      <div className="h-4 w-32 rounded-lg skeleton-shimmer" />
      <div className="h-3 w-20 rounded-lg skeleton-shimmer" />
      <div className="h-3 w-12 rounded-lg skeleton-shimmer" />
    </div>
    <div className="flex flex-col items-center gap-3 shrink-0">
      <div className="w-9 h-9 rounded-2xl skeleton-shimmer" />
      <div className="w-9 h-9 rounded-2xl skeleton-shimmer" />
    </div>
  </div>
);

// --- Category Settings Modal ---

const CategorySettingsModal = ({
  isOpen,
  onClose,
  categories,
  onAdd,
  onDelete,
  onEdit,
  onToggleDemo,
  onUploadPhoto
}: {
  isOpen: boolean,
  onClose: () => void,
  categories: Category[],
  onAdd: (name: string) => void,
  onDelete: (name: string) => void,
  onEdit: (oldName: string, newName: string) => void,
  onToggleDemo: (catId: string, newValue: boolean) => void,
  onUploadPhoto: (catId: string, file: File) => Promise<void>
}) => {
  const [newCatName, setNewCatName] = useState("");
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [tempEditName, setTempEditName] = useState("");
  const [catToDelete, setCatToDelete] = useState<string | null>(null);
  const [catToToggle, setCatToToggle] = useState<Category | null>(null);
  const [uploadingCatId, setUploadingCatId] = useState<string | null>(null);
  const catFileRef = useRef<HTMLInputElement>(null);
  const catFileTargetId = useRef<string | null>(null);

  const handlePickPhoto = (catId: string) => {
    catFileTargetId.current = catId;
    catFileRef.current?.click();
  };

  const handleCatFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const catId = catFileTargetId.current;
    if (!file || !catId) return;
    if (file.size > 8 * 1024 * 1024) { alert('Imagem muito grande. Máximo 8 MB.'); return; }
    setUploadingCatId(catId);
    try {
      await onUploadPhoto(catId, file);
    } catch {
      alert('Erro ao enviar a foto. Tente novamente.');
    } finally {
      setUploadingCatId(null);
      if (catFileRef.current) catFileRef.current.value = '';
    }
  };

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
                className="w-10 h-10 rounded-2xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-red-400" />
              </button>
            </div>

            <input ref={catFileRef} type="file" accept="image/*,image/avif,.avif" className="hidden" onChange={handleCatFileChange} />

            <div className="space-y-3 mb-8 max-h-[350px] overflow-y-auto pr-2 scrollbar-none">
              {categories.map((cat, idx) => (
                <div key={idx} className="group relative">
                  <div className={cn(
                    "flex items-center justify-between p-4 glass rounded-[24px] border border-transparent transition-all",
                    editingCatName === cat.name && "border-blue-500/30 bg-blue-500/5 shadow-lg shadow-blue-500/10"
                  )}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Miniatura / upload de foto */}
                      <button
                        type="button"
                        onClick={() => handlePickPhoto(cat.id)}
                        title="Enviar/trocar foto da categoria"
                        className="relative w-10 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-[#1b1f2e] flex items-center justify-center"
                      >
                        {uploadingCatId === cat.id ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                        ) : cat.photo_url ? (
                          <img src={cat.photo_url} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-4 h-4 text-white/25" />
                        )}
                      </button>

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
                      {/* Toggle liberar para demo */}
                      <button
                        onClick={() => setCatToToggle(cat)}
                        title={cat.demo_access ? 'Liberado para demo — clique para bloquear' : 'Bloqueado — clique para liberar ao demo'}
                        className="flex items-center gap-1.5 mr-1"
                      >
                        <span className={`text-[8px] font-black uppercase tracking-wider ${cat.demo_access ? 'text-green-400' : 'text-white/20'}`}>Demo</span>
                        <div className={`relative w-8 h-4 rounded-full transition-colors ${cat.demo_access ? 'bg-green-500' : 'bg-white/15'}`}>
                          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${cat.demo_access ? 'left-4' : 'left-0.5'}`} />
                        </div>
                      </button>
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

          {/* Confirmar liberar/bloquear categoria para demo */}
          {catToToggle && (
            <>
              <div className="fixed inset-0 bg-black/70 z-[210]" onClick={() => setCatToToggle(null)} />
              <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-[211] max-w-sm mx-auto bg-[#161929] border border-white/10 rounded-3xl p-6 shadow-2xl text-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${catToToggle.demo_access ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                  {catToToggle.demo_access
                    ? <Lock className="w-6 h-6 text-red-400" />
                    : <LockOpen className="w-6 h-6 text-green-400" />}
                </div>
                <h3 className="font-black text-lg mb-2">
                  {catToToggle.demo_access ? 'Bloquear categoria para demo?' : 'Liberar categoria para demo?'}
                </h3>
                <p className="text-sm text-white/50 mb-6">
                  {catToToggle.demo_access
                    ? <>Os clientes demo voltarão a ver os fornecedores de <span className="text-white font-bold">{catToToggle.name}</span> bloqueados.</>
                    : <>Os clientes demo verão <span className="text-white font-bold">todos os fornecedores</span> da categoria <span className="text-white font-bold">{catToToggle.name}</span>.</>}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCatToToggle(null)}
                    className="flex-1 h-11 rounded-2xl font-bold text-sm text-white/60 glass hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => { const c = catToToggle; setCatToToggle(null); onToggleDemo(c.id, !c.demo_access); }}
                    className={`flex-1 h-11 rounded-2xl font-bold text-sm text-white transition-colors ${catToToggle.demo_access ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                  >
                    {catToToggle.demo_access ? 'Bloquear' : 'Liberar'}
                  </button>
                </div>
              </div>
            </>
          )}
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'demo'>('demo');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<Client | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClients();
      // Restaura rascunho de novo cliente se existir (resistente a reload do PWA no celular)
      try {
        const draft = localStorage.getItem('brasconect_new_client_draft');
        if (draft) {
          const d = JSON.parse(draft);
          setFormName(d.name ?? '');
          setFormEmail(d.email ?? '');
          setFormPhone(d.phone ?? '');
          setEditingClient(null);
          setIsFormOpen(true);
        }
      } catch {}
    }
  }, [isOpen]);

  // Salva rascunho a cada mudança nos campos (somente quando criando novo cliente)
  useEffect(() => {
    if (!isFormOpen || editingClient) return;
    try {
      localStorage.setItem('brasconect_new_client_draft', JSON.stringify({
        name: formName, email: formEmail, phone: formPhone,
      }));
    } catch {}
  }, [formName, formEmail, formPhone, isFormOpen, editingClient]);

  const clearDraft = () => {
    try { localStorage.removeItem('brasconect_new_client_draft'); } catch {}
  };

  const handleCloseForm = () => {
    if (!editingClient) clearDraft();
    setIsFormOpen(false);
  };

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
    setFormError('');
    setIsFormOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingClient(c);
    setFormName(c.name);
    setFormEmail(c.email);
    setFormPhone(formatPhone(c.phone));
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError('Nome é obrigatório.'); return; }
    if (!formEmail.trim()) { setFormError('E-mail é obrigatório.'); return; }
    setFormLoading(true);
    try {
      if (editingClient) {
        await db.updateClient(editingClient.id, { name: formName.trim(), email: formEmail.trim(), phone: formPhone.trim() });
      } else {
        await db.createClient({ name: formName.trim(), email: formEmail.trim(), phone: formPhone.trim(), active: true });
      }
      clearDraft();
      setIsFormOpen(false);
      await loadClients();
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
    await db.toggleClientStatus(id);
  };

  const handleGrantAccess = async (id: string) => {
    // Salva estado anterior para rollback
    const prevClient = clients.find(c => c.id === id);
    const prevIsDemo = prevClient?.isDemo ?? false;
    // Atualização otimista
    setClients(prev => prev.map(c => c.id === id ? { ...c, isDemo: !c.isDemo } : c));
    try {
      const newValue = await db.toggleDemoAccess(id);
      // Sincroniza com o valor confirmado pelo banco
      setClients(prev => prev.map(c => c.id === id ? { ...c, isDemo: newValue } : c));
    } catch (err) {
      console.error('Erro ao alterar acesso:', err);
      // Rollback visual
      setClients(prev => prev.map(c => c.id === id ? { ...c, isDemo: prevIsDemo } : c));
      alert('Erro ao alterar acesso. Tente novamente.');
    }
  };

  const handleDelete = async (id: string) => {
    await db.deleteClient(id);
    setConfirmDelete(null);
    await loadClients();
  };

  const filtered = clients.filter(c => {
    const phoneDigitsClient = c.phone.replace(/\D/g, '');
    const phoneDigitsSearch = search.replace(/\D/g, '');
    const matchSearch = !search
      || c.name.toLowerCase().includes(search.toLowerCase())
      || c.email.toLowerCase().includes(search.toLowerCase())
      || (phoneDigitsSearch.length > 0 && phoneDigitsClient.includes(phoneDigitsSearch));
    const matchStatus = statusFilter === 'all'
      || (statusFilter === 'active' && !c.isDemo)
      || (statusFilter === 'demo' && c.isDemo);
    return matchSearch && matchStatus;
  });

  const activeCount = clients.filter(c => !c.isDemo).length;
  const demoCount = clients.filter(c => c.isDemo).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-x-4 top-6 bottom-6 z-[101] flex flex-col bg-[#0d0f1a] rounded-3xl shadow-2xl max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 w-full">

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
            <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center transition-colors">
              <X className="w-5 h-5 text-red-400" />
            </button>
          </div>

          {/* Stats / Filtro */}
          <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2 ml-1">Selecione o filtro clicando no card abaixo</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              onClick={() => setStatusFilter(f => f === 'active' ? 'all' : 'active')}
              className={`glass rounded-2xl p-4 flex items-center gap-3 transition-all ${statusFilter === 'active' ? 'border border-green-500/50 shadow-[0_0_10px_rgba(74,222,128,0.15)]' : 'border border-transparent'}`}
            >
              <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-left">
                <p className="text-lg font-black text-green-400">{activeCount}</p>
                <p className="text-[10px] text-white/40 font-medium">Ativos</p>
              </div>
            </button>
            <button
              onClick={() => setStatusFilter(f => f === 'demo' ? 'all' : 'demo')}
              className={`glass rounded-2xl p-4 flex items-center gap-3 transition-all ${statusFilter === 'demo' ? 'border shadow-[0_0_10px_rgba(201,165,90,0.15)]' : 'border border-transparent'}`}
              style={statusFilter === 'demo' ? { borderColor: 'rgba(201,165,90,0.5)' } : {}}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,165,90,0.15)' }}>
                <UserIcon className="w-4 h-4" style={{ color: '#c9a55a' }} />
              </div>
              <div className="text-left">
                <p className="text-lg font-black" style={{ color: '#c9a55a' }}>{demoCount}</p>
                <p className="text-[10px] text-white/40 font-medium">Demo</p>
              </div>
            </button>
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
                <div
                  key={c.id}
                  className="glass rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform"
                  onClick={() => openEdit(c)}
                >
                  <div className="flex items-stretch justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
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

                    {/* Cadeado demo */}
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmToggle(c); }}
                      title={c.isDemo ? 'Acesso demo — clique para liberar acesso completo' : 'Acesso completo — clique para voltar ao demo'}
                      className={`self-stretch flex items-center justify-center w-14 rounded-xl transition-colors flex-shrink-0 ${
                        c.isDemo
                          ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400'
                          : 'bg-green-500/15 hover:bg-green-500/25 text-green-400'
                      }`}
                    >
                      {c.isDemo
                        ? <Lock className="w-7 h-7" />
                        : <LockOpen className="w-7 h-7" />
                      }
                    </button>
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
          <div className="fixed inset-0 bg-black/70 z-[110]" onClick={handleCloseForm} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[111] max-w-md mx-auto bg-[#161929] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={handleCloseForm} className="w-10 h-10 rounded-2xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-red-400" />
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

              {editingClient && (
                <button
                  type="button"
                  onClick={() => { setIsFormOpen(false); setConfirmDelete(editingClient); }}
                  className="w-full h-11 rounded-2xl font-bold text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Cliente
                </button>
              )}
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

      {/* Confirm Toggle (Liberar/Bloquear acesso) */}
      {confirmToggle && (
        <>
          <div className="fixed inset-0 bg-black/70 z-[110]" onClick={() => setConfirmToggle(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[111] max-w-sm mx-auto bg-[#161929] border border-white/10 rounded-3xl p-6 shadow-2xl text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${confirmToggle.isDemo ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {confirmToggle.isDemo
                ? <LockOpen className="w-6 h-6 text-green-400" />
                : <Lock className="w-6 h-6 text-red-400" />}
            </div>
            <h3 className="font-black text-lg mb-2">
              {confirmToggle.isDemo ? 'Liberar acesso?' : 'Bloquear acesso?'}
            </h3>
            <p className="text-sm text-white/50 mb-6">
              {confirmToggle.isDemo
                ? <>O cliente <span className="text-white font-bold">{confirmToggle.name}</span> terá acesso completo a todos os fornecedores.</>
                : <>O cliente <span className="text-white font-bold">{confirmToggle.name}</span> voltará para a conta demo (acesso limitado).</>}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmToggle(null)}
                className="flex-1 h-11 rounded-2xl font-bold text-sm text-white/60 glass hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { const c = confirmToggle; setConfirmToggle(null); handleGrantAccess(c.id); }}
                className={`flex-1 h-11 rounded-2xl font-bold text-sm text-white transition-colors ${confirmToggle.isDemo ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {confirmToggle.isDemo ? 'Liberar' : 'Bloquear'}
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
              <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-red-400" />
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
  const [step, setStep] = useState<'email' | 'password' | 'register'>('email');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [systemLogoUrl, setSystemLogoUrl] = useState<string | null>(null);
  const [installVideoUrl, setInstallVideoUrl] = useState<string | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');

  useEffect(() => {
    db.getSystemLogoUrl().then(setSystemLogoUrl);
    db.getInstallVideoUrl().then(setInstallVideoUrl);
  }, []);

  const handleVideoModalClose = () => {
    setIsVideoModalOpen(false);
    setVideoPlaying(false);
    if (videoRef.current) videoRef.current.pause();
  };

  const handleOpenVideoModal = () => {
    if (!installVideoUrl || videoLoading) return;
    setVideoLoading(true);

    const tempVideo = document.createElement('video');
    tempVideo.src = installVideoUrl;
    tempVideo.preload = 'auto';
    tempVideo.playsInline = true;
    tempVideo.muted = true;

    // Timeout de segurança: abre após 6s mesmo sem carregar completamente
    const timeout = setTimeout(() => {
      cleanup();
      setVideoLoading(false);
      setIsVideoModalOpen(true);
    }, 6000);

    let opened = false;
    const open = () => {
      if (opened) return;
      // Garante que o primeiro frame está renderizado
      if (tempVideo.readyState < 3) return;
      opened = true;
      cleanup();
      setVideoLoading(false);
      setIsVideoModalOpen(true);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      ['loadeddata', 'canplaythrough', 'error'].forEach(ev => {
        tempVideo.removeEventListener(ev, open);
      });
    };

    // Só abre quando readyState >= 3 (HAVE_FUTURE_DATA — frame pronto)
    ['loadeddata', 'canplaythrough', 'error'].forEach(ev => {
      tempVideo.addEventListener(ev, open);
    });
    tempVideo.load();
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await db.demoRegister(regName.trim(), regEmail.trim(), regPhone.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'email_already_registered') {
        setError('Este e-mail já está cadastrado. Faça login.');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-md p-10 text-center rounded-[40px]">
        {(systemLogoUrl || localStorage.getItem('brasconect_logo_url')) && (
          <div className="w-20 h-20 bg-black border border-white/10 rounded-full overflow-hidden flex items-center justify-center mx-auto mb-8 shadow-lg select-none">
            <img src={systemLogoUrl || localStorage.getItem('brasconect_logo_url') || ''} alt="Logo" className="w-full h-full object-cover" />
          </div>
        )}
        <h1 className="text-3xl font-bold mb-1 tracking-tighter">Bras Conect</h1>
        <p className="text-white/30 mb-10 text-xs font-bold uppercase tracking-[0.2em]">
          {step === 'register' ? 'crie sua conta' : 'acesse sua conta'}
        </p>

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
            <button type="button" onClick={() => { setStep('register'); setError(null); }}
              className="w-full h-12 rounded-2xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 font-bold text-sm transition-all">
              Criar conta
            </button>
          </form>
        ) : step === 'password' ? (
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
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Nome completo *</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => { setRegName(e.target.value); setError(null); }}
                placeholder="Seu nome"
                autoFocus
                className="w-full h-14 glass rounded-2xl px-5 outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/10"
              />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">E-mail *</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => { setRegEmail(e.target.value); setError(null); }}
                placeholder="seu@email.com"
                className="w-full h-14 glass rounded-2xl px-5 outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/10"
              />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Telefone com DDD</label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => { setRegPhone(formatPhone(e.target.value)); setError(null); }}
                placeholder="(11) 99999-9999"
                className="w-full h-14 glass rounded-2xl px-5 outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/10"
              />
            </div>
            {error && <p className="text-red-400 text-xs font-bold text-left px-1">{error}</p>}
            <button type="submit" disabled={loading || !regName.trim() || !regEmail.trim()}
              className="w-full h-14 btn-gradient text-white font-bold rounded-2xl mt-2 text-lg disabled:opacity-50 disabled:pointer-events-none">
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setError(null); }}
              className="w-full h-12 rounded-2xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 font-bold text-sm transition-all">
              Já tenho conta
            </button>
          </form>
        )}

        {/* Botão "Como instalar o app" — sempre visível */}
        <button
          type="button"
          onClick={handleOpenVideoModal}
          disabled={videoLoading}
          className={cn(
            "mt-6 w-full flex items-center justify-center gap-2.5 h-12 rounded-2xl border font-bold text-sm transition-all",
            installVideoUrl && !videoLoading
              ? "border-[#c9a55a]/30 text-[#c9a55a] hover:bg-[#c9a55a]/10 active:scale-95 cursor-pointer"
              : "border-white/10 text-white/25 cursor-default"
          )}
        >
          {videoLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-[#c9a55a]/30 border-t-[#c9a55a] rounded-full animate-spin shrink-0" />
              Carregando vídeo...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
              </svg>
              Como instalar o app
            </>
          )}
        </button>
      </div>

      {/* Modal de vídeo de instalação */}
      {isVideoModalOpen && installVideoUrl && (
        <>
          <div
            className="fixed inset-0 backdrop-blur-sm z-[300]"
            style={{ background: 'rgba(10, 13, 26, 0.92)' }}
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
                className="w-10 h-10 rounded-2xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-red-400" />
              </button>
            </div>

            {/* Player de vídeo com botão pulsante */}
            <div className="bg-black relative w-full" style={{ aspectRatio: '9/16', maxHeight: '70vh' }}>
              <video
                ref={videoRef}
                src={installVideoUrl}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                autoPlay
                preload="metadata"
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
                  <span className="absolute w-28 h-28 rounded-full animate-ping opacity-20" style={{ background: '#c9a55a' }} />
                  {/* Anel médio */}
                  <span className="absolute w-24 h-24 rounded-full opacity-30" style={{ background: '#c9a55a' }} />
                  {/* Botão play central */}
                  <span className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-2xl" style={{ background: '#c9a55a' }}>
                    <svg className="w-9 h-9 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
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
      <div
        key={first.id}
        onClick={() => { if (first.link) window.open(first.link, '_blank', 'noreferrer'); }}
        className={cn("w-full relative overflow-hidden rounded-[20px]", first.link ? 'cursor-pointer active:scale-[0.98] transition-transform' : '')}
        style={{ aspectRatio: '4/5' }}
      >
        <img src={first.photoUrl} alt="banner 1" className="w-full h-full object-cover" />
      </div>

      {/* Demais banners — grade 2 por linha, 1:1 */}
      {rest.length > 0 && (
        <div className="w-full grid grid-cols-2 gap-3">
          {rest.map((b, i) => (
            <div
              key={b.id}
              onClick={() => { if (b.link) window.open(b.link, '_blank', 'noreferrer'); }}
              className={cn("relative aspect-square overflow-hidden rounded-[16px]", b.link ? 'cursor-pointer active:scale-[0.97] transition-transform' : '')}
            >
              <img src={b.photoUrl} alt={`banner ${i + 2}`} className="w-full h-full object-cover" />
            </div>
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
              <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-red-400" />
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
  onSave: (data: Omit<Supplier, 'id' | 'createdAt' | 'code' | 'isFavorite'>, photoFile?: File) => Promise<void>;
  onDelete?: () => Promise<void>;
}) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initial?.categories?.length ? initial.categories : (initial?.category ? [initial.category] : [])
  );
  const [instagram, setInstagram] = useState(initial?.instagram ?? '');
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? '');
  const [photoFile, setPhotoFile] = useState<File | undefined>(undefined);
  const [demoAccess, setDemoAccess] = useState(initial?.demoAccess ?? false);
  const [isNew, setIsNew] = useState(initial?.isNew ?? false);
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
      category: selectedCategories[0] ?? '',
      categories: selectedCategories,
      instagram: instagram.trim().replace('@', '') || undefined,
      photoUrl: photoUrl || undefined,
      demoAccess,
      isNew,
    }, photoFile);
    setSaving(false);
  };

  const avatarColor = categories.find(c => c.name === selectedCategories[0])?.color ?? '#94a3b8';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight">{initial ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
        <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center transition-colors">
          <X className="w-5 h-5 text-red-400" />
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
          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Categorias</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCatOpen(v => !v)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-sm text-left flex items-center justify-between outline-none focus:border-white/20 transition-colors"
            >
              <span className={selectedCategories.length > 0 ? 'text-white' : 'text-white/20'}>
                {selectedCategories.length > 0 ? `${selectedCategories.length} categoria${selectedCategories.length > 1 ? 's' : ''} selecionada${selectedCategories.length > 1 ? 's' : ''}` : 'Selecione as categorias'}
              </span>
              <ChevronDown className={`w-4 h-4 text-white/30 transition-transform duration-200 ${isCatOpen ? 'rotate-180' : ''}`} />
            </button>
            {isCatOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsCatOpen(false)} />
                <div className="absolute left-0 right-0 mt-2 bg-[#161929] border border-white/10 rounded-2xl shadow-2xl z-20 flex flex-col">
                  <div className="p-1.5 flex flex-col gap-0.5 max-h-[200px] overflow-y-auto overscroll-contain">
                    {categories.map(c => {
                      const selected = selectedCategories.includes(c.name);
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setSelectedCategories(prev =>
                            selected ? prev.filter(x => x !== c.name) : [...prev, c.name]
                          )}
                          className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-all flex items-center justify-between gap-3 ${selected ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </div>
                          {selected && <Check className="w-3.5 h-3.5 text-[#c9a55a] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-1.5 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setIsCatOpen(false)}
                      className="w-full h-9 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirmar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Chips das categorias selecionadas */}
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedCategories.map(name => {
                const cat = categories.find(c => c.name === name);
                return (
                  <span
                    key={name}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                    style={{ background: `${cat?.color ?? '#94a3b8'}25`, color: cat?.color ?? '#94a3b8', border: `1px solid ${cat?.color ?? '#94a3b8'}40` }}
                  >
                    {name}
                    <button type="button" onClick={() => setSelectedCategories(prev => prev.filter(x => x !== name))} className="ml-0.5 opacity-60 hover:opacity-100">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          {selectedCategories.length === 0 && (
            <p className="text-[11px] text-red-400/70 mt-1.5">Selecione ao menos uma categoria</p>
          )}
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

      {/* Toggle Grátis */}
      <div className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">Grátis</p>
          <p className="text-[11px] text-white/30 mt-0.5">Clientes demo podem ver este fornecedor</p>
        </div>
        <button
          type="button"
          onClick={() => setDemoAccess(v => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${demoAccess ? 'bg-[#c9a55a]' : 'bg-white/10'}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${demoAccess ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {/* Toggle Novidade */}
      <div className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">Novidade</p>
          <p className="text-[11px] text-white/30 mt-0.5">Exibe badge "Novidade" no card</p>
        </div>
        <button
          type="button"
          onClick={() => setIsNew(v => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${isNew ? 'bg-[#c9a55a]' : 'bg-white/10'}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isNew ? 'left-7' : 'left-1'}`} />
        </button>
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
  const [videoCopied, setVideoCopied] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Upgrade URL (conta demo)
  const [upgradeUrl, setUpgradeUrl] = useState('');
  const [upgradeSaving, setUpgradeSaving] = useState(false);
  const [upgradeSaved, setUpgradeSaved] = useState(false);

  const handleCopyVideoUrl = () => {
    if (!videoUrl) return;
    try {
      navigator.clipboard.writeText(videoUrl).then(() => {
        setVideoCopied(true);
        setTimeout(() => setVideoCopied(false), 2000);
      }).catch(() => {
        const el = document.createElement('textarea');
        el.value = videoUrl;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setVideoCopied(true);
        setTimeout(() => setVideoCopied(false), 2000);
      });
    } catch {
      const el = document.createElement('textarea');
      el.value = videoUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setVideoCopied(true);
      setTimeout(() => setVideoCopied(false), 2000);
    }
  };

  useEffect(() => {
    db.getInstallVideoUrl().then(setVideoUrl);
    db.getUpgradeUrl().then(setUpgradeUrl);
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
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-red-400" />
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
                <div className="px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-white/30 font-medium">Vídeo atual</p>
                    <button
                      type="button"
                      onClick={async () => { setVideoUrl(null); await db.setInstallVideoUrl(null); }}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-white/30 font-mono truncate flex-1">{videoUrl}</p>
                    <button
                      type="button"
                      onClick={handleCopyVideoUrl}
                      className="shrink-0 text-[10px] font-bold transition-colors"
                      style={{ color: videoCopied ? '#4ade80' : '#c9a55a' }}
                    >
                      {videoCopied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
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

          {/* Divisor */}
          <div className="border-t border-white/5" />

          {/* Link de upgrade (conta demo) */}
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Link "Liberar Acesso Completo"</p>
            <p className="text-[11px] text-white/20 mb-4">Aparece no popup quando um cliente demo tenta acessar um fornecedor bloqueado.</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={upgradeUrl}
                onChange={e => { setUpgradeUrl(e.target.value); setUpgradeSaved(false); }}
                placeholder="https://seusite.com/comprar"
                className="flex-1 h-12 bg-white/[0.04] border border-white/10 rounded-2xl px-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
              />
              <button
                type="button"
                disabled={upgradeSaving}
                onClick={async () => {
                  setUpgradeSaving(true);
                  await db.setUpgradeUrl(upgradeUrl);
                  setUpgradeSaving(false);
                  setUpgradeSaved(true);
                  setTimeout(() => setUpgradeSaved(false), 2000);
                }}
                className="h-12 px-5 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
                style={{ background: upgradeSaved ? 'rgba(74,222,128,0.15)' : 'rgba(201,165,90,0.15)', color: upgradeSaved ? '#4ade80' : '#c9a55a' }}
              >
                {upgradeSaving ? '...' : upgradeSaved ? 'Salvo!' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Notifications Modal ──────────────────────────────────────────────────────

const NotificationsModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [history, setHistory] = useState<import('@/src/lib/db').Notification[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirmDeleteNotif, setConfirmDeleteNotif] = useState<string | null>(null);
  const notifFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setHistoryLoading(true);
    db.getNotificationsHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [isOpen]);

  const handleSend = async () => {
    if (!title.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await db.sendPushNotification(title.trim(), body.trim(), photoUrl || undefined);
      setSent(true);
      setTitle('');
      setBody('');
      setPhotoUrl('');
      setTimeout(() => setSent(false), 3000);
      db.getNotificationsHistory().then(setHistory).catch(() => {});
    } catch {
      setSendError('Erro ao enviar. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed inset-x-4 top-6 bottom-6 z-[101] flex flex-col bg-[#0d0f1a] rounded-3xl shadow-2xl max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 w-full">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,165,90,0.2)' }}>
                <Bell className="w-5 h-5" style={{ color: '#c9a55a' }} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Notificações</h2>
                <p className="text-xs text-white/40">Envie para todos os clientes</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center transition-colors">
              <X className="w-5 h-5 text-red-400" />
            </button>
          </div>

          {/* Form */}
          <div className="glass rounded-2xl p-5 mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Nova Notificação</p>
            <div className="flex flex-col gap-3">
              {/* Upload foto (4:5) */}
              <div>
                <label className="block text-xs font-bold text-white/40 mb-1.5 uppercase tracking-wider">Foto do popup (4:5)</label>
                <button type="button" onClick={() => notifFileRef.current?.click()} disabled={uploading}
                  className="relative w-full overflow-hidden border-2 border-dashed border-white/15 hover:border-white/30 transition-colors flex items-center justify-center rounded-2xl"
                  style={{ aspectRatio: '4/5', background: photoUrl ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
                  {uploading ? (
                    <><div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /><span className="text-xs text-white/30 font-bold ml-2">Enviando...</span></>
                  ) : photoUrl ? (
                    <img src={photoUrl} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="w-6 h-6 text-white/20" />
                      <span className="text-xs text-white/30 font-bold">Clique para adicionar foto</span>
                      <span className="text-[10px] text-white/15">Opcional — aparece no popup do cliente</span>
                    </div>
                  )}
                </button>
                {photoUrl && (
                  <button type="button" onClick={() => setPhotoUrl('')}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 mt-1.5 ml-1">
                    Remover foto
                  </button>
                )}
                <input ref={notifFileRef} type="file" accept="image/*,image/avif,.avif" className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 8 * 1024 * 1024) { setSendError('Imagem muito grande. Máximo 8 MB.'); return; }
                    setUploading(true);
                    setSendError(null);
                    try {
                      const url = await db.uploadNotificationPhoto(file);
                      setPhotoUrl(url);
                    } catch (err: unknown) {
                      setSendError(`Erro ao enviar: ${err instanceof Error ? err.message : String(err)}`);
                    } finally {
                      setUploading(false);
                      if (notifFileRef.current) notifFileRef.current.value = '';
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 mb-1.5 uppercase tracking-wider">Título *</label>
                <input
                  value={title}
                  onChange={e => { setTitle(e.target.value); setSendError(null); }}
                  placeholder="Ex: Nova coleção disponível!"
                  className="w-full px-4 py-3 glass rounded-2xl text-sm text-white placeholder-white/20 bg-transparent outline-none border border-white/10 focus:border-[#c9a55a]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 mb-1.5 uppercase tracking-wider">Descrição</label>
                <textarea
                  value={body}
                  onChange={e => { setBody(e.target.value); setSendError(null); }}
                  placeholder="Descrição da notificação..."
                  rows={3}
                  className="w-full px-4 py-3 glass rounded-2xl text-sm text-white placeholder-white/20 bg-transparent outline-none border border-white/10 focus:border-[#c9a55a]/40 resize-none"
                />
              </div>
              {sendError && (
                <p className="text-red-400 text-xs font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {sendError}
                </p>
              )}
              <button
                onClick={handleSend}
                disabled={sending || !title.trim()}
                className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: sent ? 'rgba(74,222,128,0.15)' : 'rgba(201,165,90,0.15)',
                  color: sent ? '#4ade80' : '#c9a55a',
                  border: `1px solid ${sent ? 'rgba(74,222,128,0.2)' : 'rgba(201,165,90,0.2)'}`,
                }}
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
                    Enviando...
                  </>
                ) : sent ? (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    Enviado com sucesso!
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 shrink-0" />
                    Enviar Notificação
                  </>
                )}
              </button>
            </div>
          </div>

          {/* History */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Histórico</p>
            {historyLoading ? (
              <div className="text-center py-10 text-white/30 text-sm">Carregando...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-white/30 text-sm font-medium">Nenhuma notificação enviada</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map(n => (
                  <div key={n.id} className="glass rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-white">{n.title}</p>
                        {n.body && <p className="text-xs text-white/40 mt-1 leading-relaxed">{n.body}</p>}
                      </div>
                      <button
                        onClick={() => setConfirmDeleteNotif(n.id)}
                        className="p-1.5 rounded-xl hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-white/20">
                        {n.sent_at ? new Date(n.sent_at).toLocaleString('pt-BR') : '—'}
                      </p>
                      {n.recipients_count != null && (
                        <p className="text-[10px] text-white/30 font-bold">
                          {n.recipients_count} destinatário{n.recipients_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm delete notification */}
      {confirmDeleteNotif && (
        <>
          <div className="fixed inset-0 bg-black/70 z-[120]" onClick={() => setConfirmDeleteNotif(null)} />
          <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-[121] max-w-sm mx-auto bg-[#161929] border border-white/10 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-black text-lg mb-2">Excluir notificação?</h3>
            <p className="text-sm text-white/50 mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteNotif(null)}
                className="flex-1 h-11 rounded-2xl font-bold text-sm text-white/60 glass hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await db.deleteNotification(confirmDeleteNotif);
                  setHistory(prev => prev.filter(x => x.id !== confirmDeleteNotif));
                  setConfirmDeleteNotif(null);
                }}
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

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

const DashboardScreen = ({ user, onLogout, onProfileUpdate }: { user: User, onLogout: () => void, onProfileUpdate: (u: User) => void }) => {
  const isAdmin = user.role === 'admin';
  const isDemo = user.isDemo === true;
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [banners, setBanners] = useState<import('./types').Banner[]>([]);
  const [isBannerSettingsOpen, setIsBannerSettingsOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [lockedPopupOpen, setLockedPopupOpen] = useState(false);
  const [upgradeUrl, setUpgradeUrlState] = useState('');

  const loadData = () => {
    // Tenta carregar do cache primeiro (instantâneo)
    try {
      const cached = localStorage.getItem('brasconect_data');
      if (cached) {
        const { supps, bans, cats, url } = JSON.parse(cached);
        if (supps?.length) setSuppliers(supps);
        if (bans?.length) setBanners(bans);
        if (cats?.length) setCategories(cats);
        if (url) setUpgradeUrlState(url);
        setDataLoading(false);
      }
    } catch {}

    // Busca dados atualizados do servidor (em segundo plano)
    setDataError(null);
    Promise.all([
      db.getSuppliersWithFavorites(user.id),
      db.getBanners(),
      db.getCategories(),
      db.getUpgradeUrl(),
    ])
      .then(([supps, bans, cats, url]) => {
        setSuppliers(supps);
        setBanners(bans);
        const finalCats = cats.length ? cats : INITIAL_CATEGORIES;
        setCategories(finalCats);
        setUpgradeUrlState(url);
        // Salva no cache para próxima abertura
        try { localStorage.setItem('brasconect_data', JSON.stringify({ supps, bans, cats: finalCats, url })); } catch {}
      })
      .catch((err) => {
        console.error(err);
        if (!suppliers.length) setDataError('Não foi possível carregar os dados. Verifique sua conexão.');
      })
      .finally(() => setDataLoading(false));
  };

  useEffect(() => { loadData(); }, [user.id]);

  // Sempre que o app abrir/recarregar, verifica se o status demo do cliente mudou
  // (admin pode ter liberado/revogado acesso enquanto estava deslogado)
  useEffect(() => {
    if (user.role !== 'client' || !user.email) return;
    db.getClientByEmail(user.email).then(client => {
      if (!client) return;
      const realIsDemo = client.isDemo ?? false;
      if (realIsDemo !== (user.isDemo ?? false)) {
        onProfileUpdate({ ...user, isDemo: realIsDemo });
      }
    }).catch(() => {});
  }, [user.id]);

  useEffect(() => {
    db.getSystemLogoUrl().then(url => {
      setSystemLogoUrl(url);
      // Salva logo no cache para o splash screen
      try { if (url) localStorage.setItem('brasconect_logo_url', url); } catch {}
    });
  }, []);

  // Register push subscription once per session (requests permission if not yet granted)
  useEffect(() => {
    const timer = setTimeout(() => { db.registerPushSubscription(); }, 2000);
    return () => clearTimeout(timer);
  }, [user.id]);

  // Carrega última notificação e verifica se há não lida (clientes)
  // Se tem foto e não foi lida, abre o popup automaticamente
  useEffect(() => {
    db.getLatestNotification().then(notif => {
      setLatestNotification(notif);
      if (!isAdmin && notif?.sent_at) {
        const lastSeen = localStorage.getItem('brasconect_last_seen_notif');
        const isUnread = !lastSeen || new Date(notif.sent_at) > new Date(lastSeen);
        setHasUnread(isUnread);
        if (isUnread && notif.photo_url) {
          setIsNotifPopupOpen(true);
        }
      }
    }).catch(() => {});
  }, [isAdmin]);

  const handleBellClick = async () => {
    if (isAdmin) {
      setIsNotificationsOpen(true);
      return;
    }
    const perm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
    setNotifPermission(perm);
    if (perm === 'denied') {
      setIsNotifPopupOpen(true);
      return;
    }
    if (perm !== 'granted') {
      try {
        const newPerm = await Notification.requestPermission();
        setNotifPermission(newPerm);
        if (newPerm === 'granted') {
          db.registerPushSubscription();
          if (latestNotification) setIsNotifPopupOpen(true);
        } else if (newPerm === 'denied') {
          setIsNotifPopupOpen(true);
        }
      } catch {}
      return;
    }
    setIsNotifPopupOpen(true);
  };

  const handleNotifPopupClose = () => {
    setIsNotifPopupOpen(false);
    if (latestNotification?.sent_at) {
      localStorage.setItem('brasconect_last_seen_notif', latestNotification.sent_at);
      setHasUnread(false);
    }
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isClientsOpen, setIsClientsOpen] = useState(false);
  const [isSystemConfigOpen, setIsSystemConfigOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Sino de notificação
  const [latestNotification, setLatestNotification] = useState<import('@/src/lib/db').Notification | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [isNotifPopupOpen, setIsNotifPopupOpen] = useState(false);
  const [isNotifDeniedPopupOpen, setIsNotifDeniedPopupOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [systemLogoUrl, setSystemLogoUrl] = useState<string | null>(null);
  const [view, setView] = useState<'overview' | 'list' | 'favorites'>('overview');
  const VIEWS: Array<'overview' | 'list' | 'favorites'> = ['overview', 'list', 'favorites'];

  // Swipe horizontal para trocar de view
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      setView(current => {
        const idx = VIEWS.indexOf(current);
        if (dx < 0 && idx < VIEWS.length - 1) return VIEWS[idx + 1];
        if (dx > 0 && idx > 0) return VIEWS[idx - 1];
        return current;
      });
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

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

  const handleUploadCategoryPhoto = async (catId: string, file: File) => {
    const url = await db.uploadCategoryPhoto(file);
    await db.updateCategory(catId, { photo_url: url });
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, photo_url: url } : c));
  };

  const handleToggleCategoryDemo = async (catId: string, newValue: boolean) => {
    // Atualização otimista
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, demo_access: newValue } : c));
    try {
      await db.updateCategory(catId, { demo_access: newValue });
      // Recarrega fornecedores para refletir o novo desbloqueio na lista
      setSuppliers(await db.getSuppliersWithFavorites(user.id));
    } catch (err) {
      console.error('Erro ao alterar categoria demo:', err);
      // Rollback
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, demo_access: !newValue } : c));
      alert('Erro ao alterar a categoria. Tente novamente.');
    }
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
  const [visibleCount, setVisibleCount] = useState(30);
  const [scrolled, setScrolled] = useState(false);
  const [loadedPhotos, setLoadedPhotos] = useState<Set<string>>(new Set());

  // Reset visibleCount when filter/search/view changes
  useEffect(() => {
    setVisibleCount(30);
  }, [searchQuery, selectedCategoryFilter, view]);


  // Track scroll + carrega mais cards ao chegar em 20% do scroll
  const scrolledRef = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 60;
      if (isScrolled !== scrolledRef.current) {
        scrolledRef.current = isScrolled;
        setScrolled(isScrolled);
      }
      const scrollable = document.body.scrollHeight - window.innerHeight;
      const scrollPercent = scrollable > 0 ? window.scrollY / scrollable : 0;
      if (scrollPercent >= 0.2) {
        startTransition(() => setVisibleCount(n => n + 30));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Suppliers filtrados e visíveis
  const filteredSuppliers = useMemo(() => {
    const list = suppliers.filter(s => {
      if (view === 'favorites') return !!s.isFavorite;
      const matchCat = selectedCategoryFilter === "all" || (s.categories ?? [s.category]).includes(selectedCategoryFilter);
      const codeStr = String(s.code).padStart(3, '0');
      const q = searchQuery.toLowerCase().replace(/^#/, '');
      const matchSearch = !searchQuery || s.name.toLowerCase().includes(q) || s.instagram?.toLowerCase().includes(q) || codeStr.includes(q);
      return matchCat && matchSearch;
    });
    // Desbloqueados primeiro, depois novidade, depois por número
    if (isAdmin || isDemo) {
      list.sort((a, b) => {
        const ua = a.isUnlocked ? 1 : 0, ub = b.isUnlocked ? 1 : 0;
        if (ub !== ua) return ub - ua;
        const na = a.isNew ? 1 : 0, nb = b.isNew ? 1 : 0;
        if (nb !== na) return nb - na;
        return a.code - b.code;
      });
    }
    return list;
  }, [suppliers, view, selectedCategoryFilter, searchQuery, isDemo]);

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
            {systemLogoUrl && (
              <img src={systemLogoUrl} alt="Logo" className="w-full h-full object-cover" />
            )}
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Bras Conect</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative" ref={menuRef}>
          {/* Sino de notificação */}
          <button
            type="button"
            onClick={handleBellClick}
            className="relative p-2.5 glass rounded-xl hover:bg-white/5 transition-colors group"
          >
            <Bell className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
            {!isAdmin && hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
            )}
          </button>

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
                <>
                  <button
                    onClick={() => { setIsNotificationsOpen(true); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-sm font-bold text-white/60 hover:text-[#c9a55a] text-left"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Notificações</span>
                  </button>

                  <button
                    onClick={() => { setIsSystemConfigOpen(true); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-sm font-bold text-white/60 hover:text-white text-left"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configuração do Sistema</span>
                  </button>
                </>
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
                        className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg shrink-0"
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
                      <div className="overflow-y-auto overscroll-contain max-h-[70vh] p-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          {(isDemo ? [...categories].sort((a, b) => (b.demo_access ? 1 : 0) - (a.demo_access ? 1 : 0)) : categories).map(c => {
                            const demoLocked = isDemo && !c.demo_access;
                            const selected = selectedCategoryFilter === c.name;
                            return (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => {
                                  if (demoLocked) return;
                                  setSelectedCategoryFilter(c.name);
                                  setIsCategoryFilterOpen(false);
                                }}
                                className={`relative rounded-2xl overflow-hidden transition-all ${demoLocked ? 'cursor-default' : 'active:scale-[0.97]'} ${selected ? 'ring-2 ring-[#c9a55a]' : ''}`}
                                style={{ aspectRatio: '4/5' }}
                              >
                                {/* Foto ou fallback escuro */}
                                {c.photo_url ? (
                                  <img src={c.photo_url} alt={c.name} className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                  <div className="absolute inset-0 bg-[#1b1f2e]" />
                                )}

                                {/* Gradiente + nome */}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-2 px-2">
                                  <span className="text-xs font-bold text-white block text-center leading-tight">{c.name}</span>
                                </div>

                                {/* Selo liberado (demo) */}
                                {isDemo && c.demo_access && (
                                  <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-green-500/90 rounded-lg px-1.5 py-0.5">
                                    <Check className="w-3 h-3 text-white" />
                                    <span className="text-[9px] font-black text-white uppercase">Liberado</span>
                                  </span>
                                )}

                                {/* Fumê + cadeado (demo bloqueada) */}
                                {demoLocked && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-white/80" style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.6))' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
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
                    const isLocked = isDemo && !supplier.isUnlocked;
                  return (
                      <div key={supplier.id}
                        onClick={async () => {
                          if (isLocked) { setLockedPopupOpen(true); return; }
                          if (!isAdmin) return;
                          const detail = await db.getSupplierDetail(supplier.id);
                          setEditingSupplier(detail ?? supplier);
                          setIsSupplierModalOpen(true);
                        }}
                        className={cn("interactive-glass rounded-[24px] sm:rounded-[32px] pt-3 pr-3 pl-3 pb-5 sm:p-7 flex items-center gap-3 sm:gap-5 group relative overflow-hidden", isAdmin || isLocked ? "cursor-pointer" : "cursor-default")}
                      >

                        {/* Badge NOVO FORNECEDOR visível mesmo em cards bloqueados */}
                        {isLocked && supplier.isNew && (
                          <div className="absolute inset-0 z-20 flex items-end justify-center pointer-events-none pb-3">
                            <span className="animate-pulse text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl bg-green-500/25 text-green-400 border border-green-500/40 shadow-[0_0_15px_rgba(74,222,128,0.3)]">
                              Novo Fornecedor
                            </span>
                          </div>
                        )}

                        {/* Cadeado centrado para cards bloqueados */}
                        {isLocked && (
                          <div className="absolute inset-0 z-10 rounded-[24px] sm:rounded-[32px] flex items-center justify-center pointer-events-none">
                            <svg className="w-8 h-8" style={{ color: '#c9a55a', filter: 'drop-shadow(0 0 8px rgba(201,165,90,0.5))' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                          </div>
                        )}

                        {/* Avatar / foto */}
                        {supplier.photoUrl ? (
                          <img src={supplier.photoUrl} alt={supplier.name}
                            className="w-16 h-16 sm:w-[90px] sm:h-[90px] rounded-full object-cover shrink-0 border-2 border-white/20"
                            style={isLocked ? { filter: 'blur(6px)' } : undefined} />
                        ) : (
                          <div className="w-16 h-16 sm:w-[90px] sm:h-[90px] rounded-full shrink-0 flex items-center justify-center text-xl sm:text-2xl font-black"
                            style={{ background: 'rgba(201,165,90,0.15)', color: GOLD, ...(isLocked ? { filter: 'blur(6px)' } : {}) }}>
                            {supplier.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                          </div>
                        )}

                        {/* Info */}
                        <div className="min-w-0 flex-1" style={isLocked ? { filter: 'blur(6px)' } : undefined}>
                          <h4 className="font-bold text-base sm:text-lg leading-tight" style={{ color: GOLD }}>{supplier.name}</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(supplier.categories ?? [supplier.category]).map((cat, i) => (
                              <span key={i} className="text-[10px] text-white/40 font-black uppercase tracking-widest flex items-center gap-1">
                                {i > 0 && <span className="text-white/20">·</span>}
                                {cat}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] font-bold mt-1.5" style={{ color: 'rgba(201,165,90,0.45)' }}>
                            #{String(supplier.code).padStart(3, '0')}
                          </p>
                          {(supplier.demoAccess || supplier.isNew) && (
                            <div className="flex gap-1.5 mt-2">
                              {supplier.demoAccess && !isLocked && (isAdmin || isDemo) && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#c9a55a]/20 text-[#c9a55a] border border-[#c9a55a]/30">
                                  Grátis
                                </span>
                              )}
                              {supplier.isNew && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30">
                                  Novidade
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Ações — empilhadas verticalmente à direita */}
                        <div className="flex flex-col items-center gap-3 shrink-0" style={isLocked ? { filter: 'blur(6px)', pointerEvents: 'none' } : undefined}>
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
                          {supplier.instagram ? (
                            <a href={`https://instagram.com/${supplier.instagram.replace('@','')}`}
                              onClick={e => {
                                e.stopPropagation();
                                e.preventDefault();
                                window.location.href = `https://instagram.com/${supplier.instagram!.replace('@','')}`;
                              }}
                              className="w-9 h-9 rounded-2xl flex items-center justify-center transition-colors"
                              style={{ background: 'rgba(201,165,90,0.12)' }}>
                              <Instagram className="w-5 h-5" style={{ color: GOLD }} />
                            </a>
                          ) : isLocked ? (
                            <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,165,90,0.12)' }}>
                              <Instagram className="w-5 h-5" style={{ color: GOLD }} />
                            </div>
                          ) : null}

                          {/* Toggles admin: Grátis + Novidade */}
                          {isAdmin && (
                            <div className="flex flex-col items-center gap-1.5">
                              <button
                                onClick={async e => {
                                  e.stopPropagation();
                                  await db.updateSupplier(supplier.id, { demoAccess: !supplier.demoAccess });
                                  setSuppliers(await db.getSuppliersWithFavorites(user.id));
                                }}
                                className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors"
                                style={{ background: supplier.demoAccess ? 'rgba(201,165,90,0.12)' : 'rgba(255,255,255,0.05)' }}
                              >
                                <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: supplier.demoAccess ? '#c9a55a' : 'rgba(255,255,255,0.2)' }}>Grátis</span>
                                <div className={`relative w-12 h-6 rounded-full transition-colors ${supplier.demoAccess ? 'bg-[#c9a55a]' : 'bg-white/20'}`}>
                                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${supplier.demoAccess ? 'left-7' : 'left-1'}`} />
                                </div>
                              </button>
                              <button
                                onClick={async e => {
                                  e.stopPropagation();
                                  await db.updateSupplier(supplier.id, { isNew: !supplier.isNew });
                                  setSuppliers(await db.getSuppliersWithFavorites(user.id));
                                }}
                                className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors"
                                style={{ background: supplier.isNew ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)' }}
                              >
                                <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: supplier.isNew ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>Novo</span>
                                <div className={`relative w-12 h-6 rounded-full transition-colors ${supplier.isNew ? 'bg-green-400' : 'bg-white/20'}`}>
                                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${supplier.isNew ? 'left-7' : 'left-1'}`} />
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Skeletons para cards ainda não carregados */}
                  {visibleCount < filteredSuppliers.length && (
                    Array.from({ length: Math.min(4, filteredSuppliers.length - visibleCount) }).map((_, i) => (
                      <SupplierSkeleton key={`sk-${i}`} />
                    ))
                  )}
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
          className={cn("fixed right-8 w-11 h-11 rounded-full glass border border-white/10 flex items-center justify-center shadow-lg z-[90] active:scale-95 transition-all", isAdmin ? "bottom-[15.5rem]" : "bottom-[7rem]")}
        >
          <ArrowUp className="w-5 h-5 text-white/60" />
        </button>
      )}

      {/* WhatsApp FAB — apenas clientes */}
      {!isAdmin && (
        <a
          href="https://wa.me/5547996077623"
          target="_blank"
          rel="noreferrer"
          className="fixed right-8 bottom-8 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(37,211,102,0.6)] z-[90] active:scale-95 transition-all"
          style={{ background: '#25D366' }}
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}

      {/* Clientes FAB — apenas admin */}
      {isAdmin && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsClientsOpen(true)}
          className="fixed bottom-28 right-8 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(201,165,90,0.5)] z-[90] active:scale-95 transition-all"
          style={{ background: 'rgba(201,165,90,0.9)' }}
        >
          <Users className="w-6 h-6 text-white" />
        </motion.button>
      )}

      {/* Notificações FAB — apenas admin */}
      {isAdmin && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsNotificationsOpen(true)}
          className="fixed bottom-[11.5rem] right-8 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(201,165,90,0.4)] z-[90] active:scale-95 transition-all"
          style={{ background: 'rgba(201,165,90,0.75)' }}
        >
          <Bell className="w-6 h-6 text-white" />
        </motion.button>
      )}

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

      {/* Popup permissão negada */}
      {isNotifDeniedPopupOpen && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]" onClick={() => setIsNotifDeniedPopupOpen(false)} />
          <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-[201] max-w-sm mx-auto bg-[#161929] border border-white/10 rounded-3xl p-7 shadow-2xl">
            <button onClick={() => setIsNotifDeniedPopupOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white/40" />
            </button>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-red-500/15">
              <Bell className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-lg font-black mb-2 text-center text-white">Notificações bloqueadas</h3>
            <p className="text-sm text-white/50 text-center leading-relaxed mb-5">
              Você bloqueou as notificações. Para recebê-las, ative manualmente:
            </p>
            <div className="bg-white/5 rounded-2xl p-4 text-sm text-white/60 leading-relaxed space-y-1">
              <p>📱 <span className="font-bold text-white/80">iPhone:</span> Ajustes → Safari → Notificações → Bras Conect → Permitir</p>
            </div>
            <button
              onClick={() => setIsNotifDeniedPopupOpen(false)}
              className="w-full h-11 rounded-2xl font-bold text-sm text-white mt-5 bg-[#c9a55a] hover:bg-[#b8924a] transition-colors"
            >
              Entendi
            </button>
          </div>
        </>
      )}

      {/* Popup de notificação (clientes) */}
      {isNotifPopupOpen && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]" onClick={handleNotifPopupClose} />
          <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-[201] max-w-sm mx-auto">
            {latestNotification?.photo_url ? (
              <div className="relative">
                <button
                  onClick={handleNotifPopupClose}
                  className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl bg-red-500/90 hover:bg-red-500 flex items-center justify-center transition-colors z-10 shadow-lg"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <img
                  src={latestNotification.photo_url}
                  alt="Novidade"
                  className="w-full rounded-3xl shadow-2xl"
                  style={{ aspectRatio: '4/5', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <div className="bg-[#161929] border border-white/10 rounded-3xl p-7 shadow-2xl">
                <button
                  onClick={handleNotifPopupClose}
                  className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-red-400" />
                </button>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(201,165,90,0.12)' }}>
                  <Bell className="w-7 h-7" style={{ color: '#c9a55a' }} />
                </div>
                {latestNotification ? (
                  <>
                    <h3 className="text-lg font-black mb-3 text-center" style={{ color: '#c9a55a' }}>
                      {latestNotification.title}
                    </h3>
                    {latestNotification.body && (
                      <p className="text-sm text-white/60 mb-5 text-center leading-relaxed">{latestNotification.body}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-white/40 text-center">Nenhuma notificação ainda.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Popup fornecedor bloqueado (conta grátis) */}
      {lockedPopupOpen && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]" onClick={() => setLockedPopupOpen(false)} />
          <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-[201] max-w-sm mx-auto bg-[#161929] border border-white/10 rounded-3xl p-7 shadow-2xl text-center">
            <button
              onClick={() => setLockedPopupOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-500/15 hover:bg-red-500/30 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(201,165,90,0.12)' }}>
              <svg className="w-7 h-7" style={{ color: '#c9a55a' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 className="text-lg font-black mb-2">Acesso bloqueado</h3>
            <p className="text-sm text-white/40 mb-7 leading-relaxed">
              Este fornecedor não está disponível na conta grátis.<br/>Libere o acesso completo para ver todos os fornecedores.
            </p>
            <a
              href={upgradeUrl || 'https://wa.me/5547996077623?text=Quero%20liberar%20o%20acesso%20no%20APP!'}
              target="_blank"
              rel="noreferrer"
              onClick={() => setLockedPopupOpen(false)}
              className="block w-full h-12 btn-gradient rounded-2xl font-bold text-sm text-white flex items-center justify-center uppercase tracking-wide"
            >
              Liberar acesso total
            </a>
          </div>
        </>
      )}

      {/* Notifications Modal — apenas admin */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <CategorySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        categories={categories}
        onAdd={handleAddCategory}
        onDelete={handleDeleteCategory}
        onEdit={handleEditCategory}
        onToggleDemo={handleToggleCategoryDemo}
        onUploadPhoto={handleUploadCategoryPhoto}
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
    let isDemo = false;
    if (profile?.role === 'client' && sessionEmail) {
      const client = await db.getClientByEmail(sessionEmail);
      if (!client) {
        // Cliente foi excluído — forçar logout
        await supabase.auth.signOut();
        setCurrentUser(null);
        throw new Error('client_deleted');
      }
      isDemo = client?.isDemo ?? false;
    }
    if (profile) {
      return {
        id: profile.id,
        name: profile.name || sessionEmail.split('@')[0],
        email: sessionEmail,
        color: profile.color,
        initials: profile.initials || sessionEmail.slice(0, 2).toUpperCase(),
        photoUrl: profile.photo_url ?? undefined,
        role: profile.role,
        isDemo,
      };
    }
    return { id: userId, name: sessionEmail.split('@')[0], email: sessionEmail, color: '#c9a55a', initials: sessionEmail.slice(0, 2).toUpperCase(), role: 'client', isDemo };
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // CRÍTICO: nunca fazer queries Supabase DIRETO no callback — causa deadlock.
      // O signInWithPassword retém o lock interno de auth e espera este callback
      // terminar antes de prosseguir. Se fizermos uma query aqui, ela trava esperando
      // o mesmo lock. Solução: deferir para fora do callback com setTimeout(fn, 0).
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          // Login novo: mantém spinner até o perfil completo (com isDemo) estar pronto.
          // Evita flash de cards desbloqueados antes do blur ser aplicado.
          setAuthLoading(true);
          setTimeout(async () => {
            try {
              const profile = await loadUserProfile(session.user.id, session.user.email ?? '');
              setCurrentUser(profile);
            } catch (err) {
              console.error('Falha ao carregar perfil:', err);
              setCurrentUser({
                id: session.user.id,
                name: session.user.email?.split('@')[0] ?? 'Usuário',
                email: session.user.email ?? '',
                color: '#c9a55a',
                initials: (session.user.email ?? 'US').slice(0, 2).toUpperCase(),
                role: 'client',
              });
            } finally {
              setAuthLoading(false);
            }
          }, 0);
        } else {
          // TOKEN_REFRESHED, INITIAL_SESSION, USER_UPDATED — atualização silenciosa
          setTimeout(async () => {
            try {
              const profile = await loadUserProfile(session.user.id, session.user.email ?? '');
              setCurrentUser(profile);
            } catch (err) {
              console.error('Falha ao carregar perfil:', err);
            }
          }, 0);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  if (authLoading) {
    return null;
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
