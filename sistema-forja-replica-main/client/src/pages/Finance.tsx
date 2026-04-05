import Layout from "@/components/Layout";
import { useNotifications } from "@/contexts/NotificationContext";
import { trpc } from "@/lib/trpc";
import {
  Plus, Wallet, BarChart3, CreditCard, Calendar, ShoppingCart, Landmark, Tag, Sliders, Monitor, FileText,
  ArrowLeftRight, Clock, PiggyBank, Pencil, X, TrendingUp, TrendingDown, Trash2, Check, ExternalLink,
  AlertTriangle, StickyNote, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const subTabs = [
  { id: "chart", icon: BarChart3, label: "Gráficos" },
  { id: "cards", icon: CreditCard, label: "Cartões" },
  { id: "calendar", icon: Calendar, label: "Calendário" },
  { id: "cart", icon: ShoppingCart, label: "Compras" },
  { id: "bank", icon: Landmark, label: "Contas" },
  { id: "tags", icon: Tag, label: "Categorias" },
  { id: "rules", icon: Sliders, label: "Regras" },
  { id: "monitor", icon: Monitor, label: "Monitor" },
  { id: "notes", icon: FileText, label: "Notas" },
  { id: "transfers", icon: ArrowLeftRight, label: "Transferências" },
  { id: "history", icon: Clock, label: "Histórico" },
  { id: "allocation", icon: PiggyBank, label: "Alocação" },
];

const expenseCategories = ["Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Educação", "Roupas", "Assinaturas", "Investimentos", "Outros"];
const COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#6B7280"];
const accountTypeLabels: Record<string, string> = { checking: "Corrente", savings: "Poupança", investment: "Investimento", wallet: "Carteira" };
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const priorityColors: Record<string, string> = { low: "text-gray-400", medium: "text-yellow-400", high: "text-red-400" };
const priorityLabels: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };

type ModalType = "transaction" | "card" | "account" | "shopping" | "rule" | "note";

export default function Finance() {
  const { addNotification } = useNotifications();
  const [activeSubTab, setActiveSubTab] = useState("calendar");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>("transaction");
  const [editingId, setEditingId] = useState<number | null>(null);

  // Transaction fields
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"income" | "expense">("expense");
  const [newCategory, setNewCategory] = useState("Alimentação");
  const [newNotes, setNewNotes] = useState("");

  // Card fields
  const [cardName, setCardName] = useState("");
  const [cardBrand, setCardBrand] = useState("Visa");
  const [cardType, setCardType] = useState<"credit" | "debit">("credit");
  const [cardLastDigits, setCardLastDigits] = useState("");
  const [cardLimit, setCardLimit] = useState("");
  const [cardClosingDay, setCardClosingDay] = useState("1");
  const [cardDueDay, setCardDueDay] = useState("10");
  const [cardColor, setCardColor] = useState("#EF4444");

  // Account fields
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<"checking" | "savings" | "investment" | "wallet">("checking");
  const [accBalance, setAccBalance] = useState("");
  const [accColor, setAccColor] = useState("#3B82F6");
  const [accIcon, setAccIcon] = useState("🏦");

  // Shopping fields
  const [shopName, setShopName] = useState("");
  const [shopPrice, setShopPrice] = useState("");
  const [shopPriority, setShopPriority] = useState<"low" | "medium" | "high">("medium");
  const [shopLink, setShopLink] = useState("");
  const [shopNotes, setShopNotes] = useState("");

  // Rule fields
  const [ruleCategory, setRuleCategory] = useState("Alimentação");
  const [ruleLimit, setRuleLimit] = useState("");
  const [ruleAlert, setRuleAlert] = useState("80");

  // Note fields
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteColor, setNoteColor] = useState("#FBBF24");

  // Transfer fields
  const [transferFrom, setTransferFrom] = useState<number | null>(null);
  const [transferTo, setTransferTo] = useState<number | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDesc, setTransferDesc] = useState("");

  // Calendar year navigation
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Backend queries
  const transactionsQuery = trpc.finance.list.useQuery({ year: calYear });
  const allTransactionsQuery = trpc.finance.list.useQuery({});
  const cardsQuery = trpc.finance.cards.list.useQuery();
  const accountsQuery = trpc.finance.accounts.list.useQuery();
  const shoppingQuery = trpc.finance.shopping.list.useQuery();
  const rulesQuery = trpc.finance.rules.list.useQuery();
  const notesQuery = trpc.finance.notes.list.useQuery();

  // Mutations
  const createTransactionMut = trpc.finance.create.useMutation({
    onSuccess: () => {
      transactionsQuery.refetch();
      allTransactionsQuery.refetch();
      toast.success(`${newType === "income" ? "Receita" : "Despesa"} "${newTitle}" adicionada!`);
      addNotification({ type: 'finance', title: newType === 'income' ? 'Receita Registrada!' : 'Despesa Registrada!', message: `"${newTitle}" - R$ ${parseFloat(newAmount || "0").toFixed(2)}`, icon: newType === 'income' ? '💰' : '💸', color: newType === 'income' ? 'text-green-400' : 'text-red-400' });
      closeModal();
    },
  });
  const updateTransactionMut = trpc.finance.update.useMutation({
    onSuccess: () => { transactionsQuery.refetch(); allTransactionsQuery.refetch(); toast.success("Transação atualizada!"); closeModal(); }
  });
  const deleteTransactionMut = trpc.finance.delete.useMutation({ onSuccess: () => { transactionsQuery.refetch(); allTransactionsQuery.refetch(); toast.info("Transação removida"); } });

  const createCardMut = trpc.finance.cards.create.useMutation({ onSuccess: () => { cardsQuery.refetch(); toast.success("Cartão adicionado!"); closeModal(); } });
  const updateCardMut = trpc.finance.cards.update.useMutation({ onSuccess: () => { cardsQuery.refetch(); toast.success("Cartão atualizado!"); closeModal(); } });
  const deleteCardMut = trpc.finance.cards.delete.useMutation({ onSuccess: () => { cardsQuery.refetch(); toast.info("Cartão removido"); } });

  const createAccountMut = trpc.finance.accounts.create.useMutation({ onSuccess: () => { accountsQuery.refetch(); toast.success("Conta adicionada!"); closeModal(); } });
  const updateAccountMut = trpc.finance.accounts.update.useMutation({ onSuccess: () => { accountsQuery.refetch(); } });
  const updateAccountEditMut = trpc.finance.accounts.update.useMutation({ onSuccess: () => { accountsQuery.refetch(); toast.success("Conta atualizada!"); closeModal(); } });
  const deleteAccountMut = trpc.finance.accounts.delete.useMutation({ onSuccess: () => { accountsQuery.refetch(); toast.info("Conta removida"); } });

  const createShoppingMut = trpc.finance.shopping.create.useMutation({ onSuccess: () => { shoppingQuery.refetch(); toast.success("Item adicionado!"); closeModal(); } });
  const updateShoppingMut = trpc.finance.shopping.update.useMutation({ onSuccess: () => { shoppingQuery.refetch(); } });
  const updateShoppingEditMut = trpc.finance.shopping.update.useMutation({ onSuccess: () => { shoppingQuery.refetch(); toast.success("Item atualizado!"); closeModal(); } });
  const deleteShoppingMut = trpc.finance.shopping.delete.useMutation({ onSuccess: () => { shoppingQuery.refetch(); toast.info("Item removido"); } });

  const createRuleMut = trpc.finance.rules.create.useMutation({ onSuccess: () => { rulesQuery.refetch(); toast.success("Regra criada!"); closeModal(); } });
  const updateRuleMut = trpc.finance.rules.update.useMutation({ onSuccess: () => { rulesQuery.refetch(); toast.success("Regra atualizada!"); closeModal(); } });
  const deleteRuleMut = trpc.finance.rules.delete.useMutation({ onSuccess: () => { rulesQuery.refetch(); toast.info("Regra removida"); } });

  const createNoteMut = trpc.finance.notes.create.useMutation({ onSuccess: () => { notesQuery.refetch(); toast.success("Nota criada!"); closeModal(); } });
  const updateNoteMut = trpc.finance.notes.update.useMutation({ onSuccess: () => { notesQuery.refetch(); toast.success("Nota atualizada!"); closeModal(); } });
  const deleteNoteMut = trpc.finance.notes.delete.useMutation({ onSuccess: () => { notesQuery.refetch(); toast.info("Nota removida"); } });

  const transactions = transactionsQuery.data ?? [];
  const allTransactions = allTransactionsQuery.data ?? [];
  const cards = cardsQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const shopping = shoppingQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const notes = notesQuery.data ?? [];

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setNewTitle(""); setNewAmount(""); setNewType("expense"); setNewCategory("Alimentação"); setNewNotes("");
    setCardName(""); setCardBrand("Visa"); setCardType("credit"); setCardLastDigits(""); setCardLimit(""); setCardClosingDay("1"); setCardDueDay("10"); setCardColor("#EF4444");
    setAccName(""); setAccType("checking"); setAccBalance(""); setAccColor("#3B82F6"); setAccIcon("🏦");
    setShopName(""); setShopPrice(""); setShopPriority("medium"); setShopLink(""); setShopNotes("");
    setRuleCategory("Alimentação"); setRuleLimit(""); setRuleAlert("80");
    setNoteTitle(""); setNoteContent(""); setNoteColor("#FBBF24");
    setTransferFrom(null); setTransferTo(null); setTransferAmount(""); setTransferDesc("");
  };

  const openModal = (type: ModalType, item?: any) => {
    setModalType(type);
    setEditingId(item?.id ?? null);
    if (item) {
      if (type === "transaction") { setNewTitle(item.title); setNewAmount(String(item.amount)); setNewType(item.type); setNewCategory(item.category); setNewNotes(item.notes ?? ""); }
      if (type === "card") { setCardName(item.name); setCardBrand(item.brand); setCardType(item.type); setCardLastDigits(item.lastDigits ?? ""); setCardLimit(String(item.cardLimit ?? "")); setCardClosingDay(String(item.closingDay ?? 1)); setCardDueDay(String(item.dueDay ?? 10)); setCardColor(item.color); }
      if (type === "account") { setAccName(item.name); setAccType(item.type); setAccBalance(String(item.balance)); setAccColor(item.color); setAccIcon(item.icon ?? "🏦"); }
      if (type === "shopping") { setShopName(item.name); setShopPrice(String(item.estimatedPrice ?? "")); setShopPriority(item.priority); setShopLink(item.link ?? ""); setShopNotes(item.notes ?? ""); }
      if (type === "rule") { setRuleCategory(item.category); setRuleLimit(String(item.monthlyLimit)); setRuleAlert(String(item.alertAt)); }
      if (type === "note") { setNoteTitle(item.title); setNoteContent(item.content ?? ""); setNoteColor(item.color); }
    }
    setShowModal(true);
  };

  const saveTransaction = () => {
    if (!newTitle.trim()) { toast.error("Digite o título"); return; }
    if (!newAmount || parseFloat(newAmount) <= 0) { toast.error("Digite um valor válido"); return; }
    const todayStr = now.toISOString().split('T')[0];
    if (editingId) {
      updateTransactionMut.mutate({ id: editingId, title: newTitle, amount: parseFloat(newAmount), type: newType, category: newCategory, notes: newNotes || undefined });
    } else {
      createTransactionMut.mutate({ title: newTitle, amount: parseFloat(newAmount), type: newType, category: newCategory, date: todayStr, month: currentMonth, year: currentYear, notes: newNotes || undefined });
    }
  };

  const saveCard = () => {
    if (!cardName.trim()) { toast.error("Digite o nome do cartão"); return; }
    const data = { name: cardName, brand: cardBrand, type: cardType, lastDigits: cardLastDigits || undefined, cardLimit: cardLimit ? parseFloat(cardLimit) : undefined, closingDay: parseInt(cardClosingDay), dueDay: parseInt(cardDueDay), color: cardColor };
    if (editingId) { updateCardMut.mutate({ id: editingId, ...data }); }
    else { createCardMut.mutate(data); }
  };

  const saveAccount = () => {
    if (!accName.trim()) { toast.error("Digite o nome da conta"); return; }
    const data = { name: accName, type: accType, balance: accBalance ? parseFloat(accBalance) : 0, color: accColor, icon: accIcon };
    if (editingId) { updateAccountEditMut.mutate({ id: editingId, ...data }); }
    else { createAccountMut.mutate(data); }
  };

  const saveShopping = () => {
    if (!shopName.trim()) { toast.error("Digite o nome do item"); return; }
    const data = { name: shopName, estimatedPrice: shopPrice ? parseFloat(shopPrice) : undefined, priority: shopPriority, link: shopLink || undefined, notes: shopNotes || undefined };
    if (editingId) { updateShoppingEditMut.mutate({ id: editingId, ...data }); }
    else { createShoppingMut.mutate(data); }
  };

  const saveRule = () => {
    if (!ruleLimit || parseFloat(ruleLimit) <= 0) { toast.error("Digite um limite válido"); return; }
    const data = { category: ruleCategory, monthlyLimit: parseFloat(ruleLimit), alertAt: parseInt(ruleAlert) || 80 };
    if (editingId) { updateRuleMut.mutate({ id: editingId, ...data }); }
    else { createRuleMut.mutate(data); }
  };

  const saveNote = () => {
    if (!noteTitle.trim()) { toast.error("Digite o título"); return; }
    const data = { title: noteTitle, content: noteContent || undefined, color: noteColor };
    if (editingId) { updateNoteMut.mutate({ id: editingId, ...data }); }
    else { createNoteMut.mutate(data); }
  };

  const doTransfer = () => {
    if (!transferFrom || !transferTo) { toast.error("Selecione as contas"); return; }
    if (!transferAmount || parseFloat(transferAmount) <= 0) { toast.error("Digite um valor válido"); return; }
    const amt = parseFloat(transferAmount);
    const fromAcc = accounts.find((a: any) => a.id === transferFrom);
    const toAcc = accounts.find((a: any) => a.id === transferTo);
    if (!fromAcc || !toAcc) return;
    if (Number(fromAcc.balance) < amt) { toast.error(`Saldo insuficiente em "${fromAcc.name}" (R$ ${Number(fromAcc.balance).toFixed(2)})`); return; }
    updateAccountMut.mutate({ id: transferFrom, balance: Number(fromAcc.balance) - amt }, {
      onSuccess: () => {
        updateAccountMut.mutate({ id: transferTo!, balance: Number(toAcc.balance) + amt }, {
          onSuccess: () => {
            accountsQuery.refetch();
            // Register as two transactions for history
            const todayStr = now.toISOString().split('T')[0];
            createTransactionMut.mutate({ title: `Transferência → ${toAcc.name}${transferDesc ? ': ' + transferDesc : ''}`, amount: amt, type: "expense", category: "Transferência", date: todayStr, month: currentMonth, year: currentYear });
            toast.success(`R$ ${amt.toFixed(2)} transferido de "${fromAcc.name}" para "${toAcc.name}"`);
            setTransferFrom(null); setTransferTo(null); setTransferAmount(""); setTransferDesc("");
          }
        });
      }
    });
  };

  const totalIncome = allTransactions.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalExpense = allTransactions.filter((t: any) => t.type === "expense" && t.category !== "Transferência").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const monthlyData = useMemo(() => {
    return monthNames.map((m, idx) => {
      const monthTx = transactions.filter((t: any) => t.month === idx + 1);
      const mIncome = monthTx.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const mExpense = monthTx.filter((t: any) => t.type === "expense" && t.category !== "Transferência").reduce((s: number, t: any) => s + Number(t.amount), 0);
      return { month: m.slice(0, 3), income: mIncome, expense: mExpense, value: mIncome - mExpense };
    });
  }, [transactions]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    allTransactions.filter((t: any) => t.type === "expense" && t.category !== "Transferência").forEach((t: any) => { map[t.category] = (map[t.category] || 0) + Number(t.amount); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [allTransactions]);

  const totalAccBalance = accounts.reduce((s: number, a: any) => s + Number(a.balance), 0);

  const modalTitle = () => {
    const prefix = editingId ? "Editar" : "Novo(a)";
    if (modalType === "transaction") return editingId ? "Editar Transação" : "Nova Transação";
    if (modalType === "card") return `${prefix} Cartão`;
    if (modalType === "account") return `${prefix} Conta`;
    if (modalType === "shopping") return editingId ? "Editar Item" : "Novo Item";
    if (modalType === "rule") return `${prefix} Regra`;
    if (modalType === "note") return `${prefix} Nota`;
    return "Novo";
  };

  const isSaving = createTransactionMut.isPending || updateTransactionMut.isPending || createCardMut.isPending || updateCardMut.isPending || createAccountMut.isPending || updateAccountEditMut.isPending || createShoppingMut.isPending || updateShoppingEditMut.isPending || createRuleMut.isPending || updateRuleMut.isPending || createNoteMut.isPending || updateNoteMut.isPending;

  return (
    <Layout>
      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Finanças</h1>
            <p className="text-sm text-gray-400">Gerenciar finanças</p>
          </div>
        </div>

        {/* Sub-tabs grid */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
          <div className="flex flex-wrap justify-center gap-3">
            {subTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} title={tab.label}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${activeSubTab === tab.id ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}>
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">{subTabs.find(t => t.id === activeSubTab)?.label}</p>
        </div>

        {/* ═══════ CALENDAR TAB ═══════ */}
        {activeSubTab === "calendar" && (
          <>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCalYear(y => y - 1)} className="p-2 hover:bg-[#2a2a2a] rounded-lg transition"><ChevronLeft className="w-4 h-4" /></button>
                <h3 className="font-bold">Saldo por Mês — {calYear}</h3>
                <button onClick={() => setCalYear(y => y + 1)} className="p-2 hover:bg-[#2a2a2a] rounded-lg transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="month" stroke="#555" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#555" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                  <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {monthNames.map((month, idx) => {
                const monthTx = transactions.filter((t: any) => t.month === idx + 1);
                const mIncome = monthTx.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
                const mExpense = monthTx.filter((t: any) => t.type === "expense" && t.category !== "Transferência").reduce((s: number, t: any) => s + Number(t.amount), 0);
                const isCurrentMonth = idx + 1 === currentMonth && calYear === currentYear;
                return (
                  <div key={month} className={`bg-[#1a1a1a] border rounded-2xl p-4 ${isCurrentMonth ? 'border-red-500/50' : 'border-[#2a2a2a]'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm">{month}</h4>
                      {isCurrentMonth && <span className="text-xs text-red-400 font-medium">Atual</span>}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between"><span className="text-xs text-green-400">Renda</span><span className="text-xs font-bold text-green-400">R$ {mIncome.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-red-400">Gastos</span><span className="text-xs font-bold text-red-400">R$ {mExpense.toFixed(2)}</span></div>
                      <div className="border-t border-[#2a2a2a] pt-1.5 flex justify-between"><span className="text-xs text-gray-400">Saldo</span><span className={`text-xs font-bold ${(mIncome - mExpense) >= 0 ? 'text-green-400' : 'text-red-500'}`}>R$ {(mIncome - mExpense).toFixed(2)}</span></div>
                      <p className="text-xs text-gray-500 text-center">{monthTx.length} transações</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ═══════ CHART TAB ═══════ */}
        {activeSubTab === "chart" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400">Receitas</p>
                <p className="text-lg font-bold text-green-400">R$ {totalIncome.toFixed(2)}</p>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400">Despesas</p>
                <p className="text-lg font-bold text-red-400">R$ {totalExpense.toFixed(2)}</p>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400">Saldo</p>
                <p className={`text-lg font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>R$ {balance.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <h3 className="font-bold mb-4">Evolução Mensal — {currentYear}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="month" stroke="#555" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#555" tick={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Receita" />
                  <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} name="Despesa" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-2">
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-green-500 rounded" /><span className="text-xs text-gray-400">Receita</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-red-500 rounded" /><span className="text-xs text-gray-400">Despesa</span></div>
              </div>
            </div>
            {categoryData.length > 0 && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
                <h3 className="font-bold mb-4">Despesas por Categoria</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1">
                  {categoryData.map((c, i) => (
                    <div key={c.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-sm text-gray-300">{c.name}</span></div>
                      <span className="text-sm font-bold text-red-400">R$ {c.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════ CARDS TAB ═══════ */}
        {activeSubTab === "cards" && (
          <div className="space-y-4">
            {cards.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 text-center">
                <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">Nenhum cartão cadastrado</p>
                <button onClick={() => openModal("card")} className="text-red-400 text-sm font-medium">+ Adicionar cartão</button>
              </div>
            ) : (
              cards.map((card: any) => (
                <div key={card.id} className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}99)` }}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-sm opacity-80">{card.type === "credit" ? "Crédito" : "Débito"}</p>
                      <p className="text-lg font-bold">{card.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold opacity-80">{card.brand}</span>
                      <button onClick={() => openModal("card", card)} className="p-1 hover:bg-white/20 rounded-lg transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => deleteCardMut.mutate({ id: card.id })} className="p-1 hover:bg-white/20 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-xl font-mono tracking-widest mb-4">•••• •••• •••• {card.lastDigits || "0000"}</p>
                  <div className="flex justify-between text-sm">
                    <div><p className="opacity-60">Limite</p><p className="font-bold">R$ {Number(card.cardLimit || 0).toFixed(2)}</p></div>
                    <div><p className="opacity-60">Fecha dia</p><p className="font-bold">{card.closingDay}</p></div>
                    <div><p className="opacity-60">Vence dia</p><p className="font-bold">{card.dueDay}</p></div>
                  </div>
                </div>
              ))
            )}
            <button onClick={() => openModal("card")} className="w-full bg-[#1a1a1a] border border-dashed border-[#444] rounded-2xl p-4 text-gray-400 hover:border-red-500 hover:text-red-400 transition flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Novo Cartão
            </button>
          </div>
        )}

        {/* ═══════ BANK ACCOUNTS TAB ═══════ */}
        {activeSubTab === "bank" && (
          <div className="space-y-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <p className="text-sm text-gray-400">Patrimônio Total</p>
              <p className={`text-2xl font-bold ${totalAccBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>R$ {totalAccBalance.toFixed(2)}</p>
            </div>
            {accounts.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 text-center">
                <Landmark className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">Nenhuma conta cadastrada</p>
                <button onClick={() => openModal("account")} className="text-red-400 text-sm font-medium">+ Adicionar conta</button>
              </div>
            ) : (
              accounts.map((acc: any) => (
                <div key={acc.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: acc.color + '30' }}>{acc.icon}</div>
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-xs text-gray-400">{accountTypeLabels[acc.type] || acc.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${Number(acc.balance) >= 0 ? 'text-green-400' : 'text-red-400'}`}>R$ {Number(acc.balance).toFixed(2)}</span>
                    <button onClick={() => openModal("account", acc)} className="text-gray-500 hover:text-blue-400 transition"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteAccountMut.mutate({ id: acc.id })} className="text-gray-500 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
            <button onClick={() => openModal("account")} className="w-full bg-[#1a1a1a] border border-dashed border-[#444] rounded-2xl p-4 text-gray-400 hover:border-red-500 hover:text-red-400 transition flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Nova Conta
            </button>
          </div>
        )}

        {/* ═══════ SHOPPING TAB ═══════ */}
        {activeSubTab === "cart" && (
          <div className="space-y-4">
            {shopping.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">Lista de compras vazia</p>
                <button onClick={() => openModal("shopping")} className="text-red-400 text-sm font-medium">+ Adicionar item</button>
              </div>
            ) : (
              <>
                {shopping.filter((s: any) => s.status === "pending").length > 0 && (
                  <div>
                    <h3 className="text-sm text-gray-400 mb-2 font-medium">Pendentes ({shopping.filter((s: any) => s.status === "pending").length})</h3>
                    {shopping.filter((s: any) => s.status === "pending").map((item: any) => (
                      <div key={item.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateShoppingMut.mutate({ id: item.id, status: "bought" })} className="w-6 h-6 rounded-full border-2 border-gray-500 hover:border-green-400 flex items-center justify-center transition" />
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${priorityColors[item.priority]}`}>{priorityLabels[item.priority]}</span>
                              {item.estimatedPrice && <span className="text-xs text-gray-400">R$ {Number(item.estimatedPrice).toFixed(2)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400"><ExternalLink className="w-4 h-4" /></a>}
                          <button onClick={() => openModal("shopping", item)} className="text-gray-500 hover:text-blue-400"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => deleteShoppingMut.mutate({ id: item.id })} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {shopping.filter((s: any) => s.status === "bought").length > 0 && (
                  <div>
                    <h3 className="text-sm text-gray-400 mb-2 font-medium">Comprados ({shopping.filter((s: any) => s.status === "bought").length})</h3>
                    {shopping.filter((s: any) => s.status === "bought").map((item: any) => (
                      <div key={item.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-2 flex items-center justify-between opacity-60">
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateShoppingMut.mutate({ id: item.id, status: "pending" })} className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"><Check className="w-4 h-4 text-white" /></button>
                          <p className="font-medium line-through">{item.name}</p>
                        </div>
                        <button onClick={() => deleteShoppingMut.mutate({ id: item.id })} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <button onClick={() => openModal("shopping")} className="w-full bg-[#1a1a1a] border border-dashed border-[#444] rounded-2xl p-4 text-gray-400 hover:border-red-500 hover:text-red-400 transition flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Novo Item
            </button>
          </div>
        )}

        {/* ═══════ CATEGORIES TAB ═══════ */}
        {activeSubTab === "tags" && (
          <div className="space-y-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <h3 className="font-bold mb-4">Gastos por Categoria</h3>
              {categoryData.length === 0 ? (
                <p className="text-gray-400 text-center py-4">Nenhuma despesa registrada</p>
              ) : (
                <div className="space-y-3">
                  {categoryData.map((cat, i) => {
                    const pct = totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0;
                    return (
                      <div key={cat.name}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-sm">{cat.name}</span></div>
                          <span className="text-sm font-bold text-red-400">R$ {cat.value.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-[#2a2a2a] rounded-full h-2">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                        <p className="text-xs text-gray-500 text-right">{pct.toFixed(1)}%</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <h3 className="font-bold mb-3">Categorias Disponíveis</h3>
              <div className="flex flex-wrap gap-2">
                {expenseCategories.map((cat, i) => (
                  <span key={cat} className="px-3 py-1.5 rounded-xl text-sm flex items-center gap-2" style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length] }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ RULES TAB ═══════ */}
        {activeSubTab === "rules" && (
          <div className="space-y-4">
            {rules.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 text-center">
                <Sliders className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">Nenhuma regra de orçamento</p>
                <p className="text-xs text-gray-500 mb-3">Defina limites de gastos por categoria</p>
                <button onClick={() => openModal("rule")} className="text-red-400 text-sm font-medium">+ Criar regra</button>
              </div>
            ) : (
              rules.map((rule: any) => {
                const spent = allTransactions.filter((t: any) => t.type === "expense" && t.category === rule.category).reduce((s: number, t: any) => s + Number(t.amount), 0);
                const pct = rule.monthlyLimit > 0 ? (spent / rule.monthlyLimit) * 100 : 0;
                const isOver = pct >= 100;
                const isWarning = pct >= rule.alertAt;
                return (
                  <div key={rule.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium">{rule.category}</p>
                        <p className="text-xs text-gray-400">Limite: R$ {Number(rule.monthlyLimit).toFixed(2)}/mês · Alerta: {rule.alertAt}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOver && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        {isWarning && !isOver && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                        <button onClick={() => openModal("rule", rule)} className="text-gray-500 hover:text-blue-400"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteRuleMut.mutate({ id: rule.id })} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="w-full bg-[#2a2a2a] rounded-full h-3 mb-2">
                      <div className={`h-3 rounded-full transition-all ${isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={isOver ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-green-400'}>R$ {spent.toFixed(2)} gastos</span>
                      <span className="text-gray-400">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })
            )}
            <button onClick={() => openModal("rule")} className="w-full bg-[#1a1a1a] border border-dashed border-[#444] rounded-2xl p-4 text-gray-400 hover:border-red-500 hover:text-red-400 transition flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Nova Regra
            </button>
          </div>
        )}

        {/* ═══════ MONITOR TAB ═══════ */}
        {activeSubTab === "monitor" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Receita Mensal</p>
                <p className="text-lg font-bold text-green-400">R$ {allTransactions.filter((t: any) => t.type === "income" && t.month === currentMonth && t.year === currentYear).reduce((s: number, t: any) => s + Number(t.amount), 0).toFixed(2)}</p>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Despesa Mensal</p>
                <p className="text-lg font-bold text-red-400">R$ {allTransactions.filter((t: any) => t.type === "expense" && t.month === currentMonth && t.year === currentYear && t.category !== "Transferência").reduce((s: number, t: any) => s + Number(t.amount), 0).toFixed(2)}</p>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Transações Mês</p>
                <p className="text-lg font-bold">{allTransactions.filter((t: any) => t.month === currentMonth && t.year === currentYear).length}</p>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Patrimônio</p>
                <p className={`text-lg font-bold ${totalAccBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>R$ {totalAccBalance.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <h3 className="font-bold mb-3">Alertas de Orçamento</h3>
              {rules.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhuma regra configurada. <button onClick={() => setActiveSubTab("rules")} className="text-red-400">Criar regra</button></p>
              ) : (
                <div className="space-y-2">
                  {rules.map((rule: any) => {
                    const spent = allTransactions.filter((t: any) => t.type === "expense" && t.category === rule.category).reduce((s: number, t: any) => s + Number(t.amount), 0);
                    const pct = rule.monthlyLimit > 0 ? (spent / rule.monthlyLimit) * 100 : 0;
                    if (pct < rule.alertAt) return null;
                    return (
                      <div key={rule.id} className={`flex items-center gap-3 p-3 rounded-xl ${pct >= 100 ? 'bg-red-500/10 border border-red-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${pct >= 100 ? 'text-red-400' : 'text-yellow-400'}`} />
                        <div>
                          <p className="text-sm font-medium">{rule.category}: {pct.toFixed(0)}% do limite</p>
                          <p className="text-xs text-gray-400">R$ {spent.toFixed(2)} / R$ {Number(rule.monthlyLimit).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                  {rules.every((rule: any) => {
                    const spent = allTransactions.filter((t: any) => t.type === "expense" && t.category === rule.category).reduce((s: number, t: any) => s + Number(t.amount), 0);
                    return rule.monthlyLimit > 0 ? (spent / rule.monthlyLimit) * 100 < rule.alertAt : true;
                  }) && <p className="text-green-400 text-sm flex items-center gap-2"><Check className="w-4 h-4" /> Todos os orçamentos dentro do limite</p>}
                </div>
              )}
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <h3 className="font-bold mb-3">Resumo de Cartões</h3>
              {cards.length === 0 ? <p className="text-gray-400 text-sm">Nenhum cartão cadastrado. <button onClick={() => setActiveSubTab("cards")} className="text-red-400">Adicionar</button></p> : (
                <div className="space-y-2">
                  {cards.map((card: any) => (
                    <div key={card.id} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-xl">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} /><span className="text-sm">{card.name}</span></div>
                      <span className="text-sm text-gray-400">{card.brand} •{card.lastDigits || "0000"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════ NOTES TAB ═══════ */}
        {activeSubTab === "notes" && (
          <div className="space-y-4">
            {notes.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 text-center">
                <StickyNote className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">Nenhuma nota financeira</p>
                <button onClick={() => openModal("note")} className="text-red-400 text-sm font-medium">+ Criar nota</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {notes.map((note: any) => (
                  <div key={note.id} className="rounded-2xl p-4 relative" style={{ backgroundColor: note.color + '20', borderLeft: `4px solid ${note.color}` }}>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button onClick={() => openModal("note", note)} className="text-gray-500 hover:text-blue-400 p-0.5"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => deleteNoteMut.mutate({ id: note.id })} className="text-gray-500 hover:text-red-400 p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                    <p className="font-medium text-sm mb-1 pr-10">{note.title}</p>
                    {note.content && <p className="text-xs text-gray-400 line-clamp-3">{note.content}</p>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => openModal("note")} className="w-full bg-[#1a1a1a] border border-dashed border-[#444] rounded-2xl p-4 text-gray-400 hover:border-red-500 hover:text-red-400 transition flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Nova Nota
            </button>
          </div>
        )}

        {/* ═══════ TRANSFERS TAB ═══════ */}
        {activeSubTab === "transfers" && (
          <div className="space-y-4">
            {accounts.length < 2 ? (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 text-center">
                <ArrowLeftRight className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">Cadastre pelo menos 2 contas para transferir</p>
                <button onClick={() => setActiveSubTab("bank")} className="text-red-400 text-sm font-medium">Ir para Contas</button>
              </div>
            ) : (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
                <h3 className="font-bold">Nova Transferência</h3>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">De</label>
                  <div className="space-y-2">
                    {accounts.map((acc: any) => (
                      <button key={acc.id} onClick={() => { setTransferFrom(acc.id); if (transferTo === acc.id) setTransferTo(null); }}
                        className={`w-full p-3 rounded-xl flex items-center justify-between transition ${transferFrom === acc.id ? 'bg-red-500/20 border border-red-500' : 'bg-[#2a2a2a] border border-transparent hover:border-[#444]'}`}>
                        <span>{acc.icon} {acc.name}</span>
                        <span className={`text-sm ${Number(acc.balance) < 0 ? 'text-red-400' : 'text-gray-400'}`}>R$ {Number(acc.balance).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Para</label>
                  <div className="space-y-2">
                    {accounts.filter((a: any) => a.id !== transferFrom).map((acc: any) => (
                      <button key={acc.id} onClick={() => setTransferTo(acc.id)}
                        className={`w-full p-3 rounded-xl flex items-center justify-between transition ${transferTo === acc.id ? 'bg-green-500/20 border border-green-500' : 'bg-[#2a2a2a] border border-transparent hover:border-[#444]'}`}>
                        <span>{acc.icon} {acc.name}</span>
                        <span className="text-sm text-gray-400">R$ {Number(acc.balance).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Valor (R$)</label>
                  <input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="0.00" min="0" step="0.01"
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                  {transferFrom && transferAmount && parseFloat(transferAmount) > 0 && (() => {
                    const fromAcc = accounts.find((a: any) => a.id === transferFrom);
                    if (fromAcc && Number(fromAcc.balance) < parseFloat(transferAmount)) {
                      return <p className="text-xs text-red-400 mt-1">⚠ Saldo insuficiente (disponível: R$ {Number(fromAcc.balance).toFixed(2)})</p>;
                    }
                    return null;
                  })()}
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Descrição (opcional)</label>
                  <input type="text" value={transferDesc} onChange={e => setTransferDesc(e.target.value)} placeholder="Ex: Pagamento de conta..."
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <button onClick={doTransfer} disabled={!transferFrom || !transferTo || !transferAmount || updateAccountMut.isPending}
                  className="w-full bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition disabled:opacity-50">
                  {updateAccountMut.isPending ? 'Transferindo...' : 'Transferir'}
                </button>
              </div>
            )}
            {/* Transfer history */}
            {allTransactions.filter((t: any) => t.category === "Transferência").length > 0 && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
                <h3 className="font-bold mb-3">Histórico de Transferências</h3>
                <div className="space-y-2">
                  {allTransactions.filter((t: any) => t.category === "Transferência").slice(0, 10).map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-xl">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="text-sm">{tx.title}</p>
                          <p className="text-xs text-gray-500">{tx.date}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-blue-400">R$ {Number(tx.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════ HISTORY TAB ═══════ */}
        {activeSubTab === "history" && (
          <div className="space-y-3">
            {allTransactions.filter((t: any) => t.category !== "Transferência").length > 0 ? (
              allTransactions.filter((t: any) => t.category !== "Transferência").map((tx: any) => (
                <div key={tx.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === "income" ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {tx.type === "income" ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
                    </div>
                    <div>
                      <p className="font-medium">{tx.title}</p>
                      <p className="text-xs text-gray-400">{tx.category} · {tx.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${tx.type === "income" ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === "income" ? '+' : '-'}R$ {Number(tx.amount).toFixed(2)}
                    </span>
                    <button onClick={() => openModal("transaction", tx)} className="text-gray-500 hover:text-blue-400 transition"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteTransactionMut.mutate({ id: tx.id })} className="text-gray-500 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 text-center">
                <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nenhuma transação registrada</p>
                <button onClick={() => openModal("transaction")} className="text-red-400 text-sm font-medium mt-2">+ Adicionar transação</button>
              </div>
            )}
          </div>
        )}

        {/* ═══════ ALLOCATION TAB ═══════ */}
        {activeSubTab === "allocation" && (
          <div className="space-y-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <h3 className="font-bold mb-2">Alocação de Orçamento</h3>
              <p className="text-xs text-gray-400 mb-4">Distribua seu orçamento por categorias usando regras</p>
              {rules.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm mb-2">Crie regras de orçamento para ver a alocação</p>
                  <button onClick={() => setActiveSubTab("rules")} className="text-red-400 text-sm font-medium">Ir para Regras</button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Total Alocado</span>
                      <span className="font-bold">R$ {rules.reduce((s: number, r: any) => s + Number(r.monthlyLimit), 0).toFixed(2)}/mês</span>
                    </div>
                    <div className="w-full bg-[#2a2a2a] rounded-full h-4 flex overflow-hidden">
                      {rules.map((rule: any, i: number) => {
                        const total = rules.reduce((s: number, r: any) => s + Number(r.monthlyLimit), 0);
                        const pct = total > 0 ? (Number(rule.monthlyLimit) / total) * 100 : 0;
                        return <div key={rule.id} className="h-4" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />;
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {rules.map((rule: any, i: number) => {
                      const spent = allTransactions.filter((t: any) => t.type === "expense" && t.category === rule.category).reduce((s: number, t: any) => s + Number(t.amount), 0);
                      const remaining = Number(rule.monthlyLimit) - spent;
                      return (
                        <div key={rule.id} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-sm">{rule.category}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">R$ {Number(rule.monthlyLimit).toFixed(2)}</p>
                            <p className={`text-xs ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {remaining >= 0 ? `R$ ${remaining.toFixed(2)} restante` : `R$ ${Math.abs(remaining).toFixed(2)} acima`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      {activeSubTab !== "transfers" && activeSubTab !== "tags" && activeSubTab !== "monitor" && activeSubTab !== "allocation" && (
        <button onClick={() => {
          if (activeSubTab === "cards") openModal("card");
          else if (activeSubTab === "bank") openModal("account");
          else if (activeSubTab === "cart") openModal("shopping");
          else if (activeSubTab === "rules") openModal("rule");
          else if (activeSubTab === "notes") openModal("note");
          else openModal("transaction");
        }} className="fixed bottom-24 right-6 w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 transition z-40">
          <Plus className="w-6 h-6 text-white" />
        </button>
      )}

      {/* ═══════ MODAL ═══════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={closeModal}>
          <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{modalTitle()}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-[#2a2a2a] rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {/* Transaction Modal */}
            {modalType === "transaction" && (
              <div className="space-y-5">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Tipo</label>
                  <div className="flex gap-2">
                    <button onClick={() => setNewType("expense")} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${newType === "expense" ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}>Despesa</button>
                    <button onClick={() => setNewType("income")} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${newType === "income" ? 'bg-green-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}>Receita</button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Título *</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Almoço, Salário..."
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Valor (R$) *</label>
                  <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0.00" min="0" step="0.01"
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Categoria</label>
                  <div className="flex gap-2 flex-wrap">
                    {expenseCategories.map(cat => (
                      <button key={cat} onClick={() => setNewCategory(cat)} className={`px-3 py-2 rounded-xl text-sm transition ${newCategory === cat ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Observações</label>
                  <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Opcional..."
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={closeModal} className="flex-1 bg-[#2a2a2a] text-gray-300 py-3 rounded-xl font-medium hover:bg-[#333] transition">Cancelar</button>
                  <button onClick={saveTransaction} disabled={isSaving} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition disabled:opacity-50">
                    {isSaving ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}

            {/* Card Modal */}
            {modalType === "card" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Nome do cartão *</label>
                  <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Ex: Nubank, Inter..."
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCardType("credit")} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${cardType === "credit" ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>Crédito</button>
                  <button onClick={() => setCardType("debit")} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${cardType === "debit" ? 'bg-blue-500 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>Débito</button>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Bandeira</label>
                  <div className="flex gap-2 flex-wrap">
                    {["Visa", "Master", "Elo", "Amex", "Hipercard"].map(b => (
                      <button key={b} onClick={() => setCardBrand(b)} className={`px-3 py-1.5 rounded-lg text-xs transition ${cardBrand === b ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>{b}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Últimos 4 dígitos</label>
                    <input type="text" value={cardLastDigits} onChange={e => setCardLastDigits(e.target.value.slice(0, 4))} placeholder="0000" maxLength={4}
                      className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Limite (R$)</label>
                    <input type="number" value={cardLimit} onChange={e => setCardLimit(e.target.value)} placeholder="0.00"
                      className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Fecha dia</label>
                    <input type="number" value={cardClosingDay} onChange={e => setCardClosingDay(e.target.value)} min="1" max="31"
                      className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Vence dia</label>
                    <input type="number" value={cardDueDay} onChange={e => setCardDueDay(e.target.value)} min="1" max="31"
                      className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none transition" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Cor</label>
                  <div className="flex gap-2">
                    {["#EF4444", "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EC4899"].map(c => (
                      <button key={c} onClick={() => setCardColor(c)} className={`w-8 h-8 rounded-full transition ${cardColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={closeModal} className="flex-1 bg-[#2a2a2a] text-gray-300 py-3 rounded-xl font-medium hover:bg-[#333] transition">Cancelar</button>
                  <button onClick={saveCard} disabled={isSaving} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition disabled:opacity-50">
                    {isSaving ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}

            {/* Account Modal */}
            {modalType === "account" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Nome da conta *</label>
                  <input type="text" value={accName} onChange={e => setAccName(e.target.value)} placeholder="Ex: Nubank, Bradesco..."
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Tipo</label>
                  <div className="flex gap-2 flex-wrap">
                    {(["checking", "savings", "investment", "wallet"] as const).map(t => (
                      <button key={t} onClick={() => setAccType(t)} className={`px-3 py-2 rounded-xl text-sm transition ${accType === t ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>{accountTypeLabels[t]}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Ícone</label>
                  <div className="flex gap-2 flex-wrap">
                    {["🏦", "💳", "💰", "🏧", "📱", "💵", "🪙", "📊"].map(ic => (
                      <button key={ic} onClick={() => setAccIcon(ic)} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition ${accIcon === ic ? 'bg-red-500/30 ring-2 ring-red-500' : 'bg-[#2a2a2a] hover:bg-[#333]'}`}>{ic}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Saldo atual (R$)</label>
                  <input type="number" value={accBalance} onChange={e => setAccBalance(e.target.value)} placeholder="0.00" step="0.01"
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Cor</label>
                  <div className="flex gap-2">
                    {["#3B82F6", "#EF4444", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899"].map(c => (
                      <button key={c} onClick={() => setAccColor(c)} className={`w-8 h-8 rounded-full transition ${accColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={closeModal} className="flex-1 bg-[#2a2a2a] text-gray-300 py-3 rounded-xl font-medium hover:bg-[#333] transition">Cancelar</button>
                  <button onClick={saveAccount} disabled={isSaving} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition disabled:opacity-50">
                    {isSaving ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}

            {/* Shopping Modal */}
            {modalType === "shopping" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Nome do item *</label>
                  <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Ex: Fone de ouvido, Livro..."
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Preço estimado (R$)</label>
                  <input type="number" value={shopPrice} onChange={e => setShopPrice(e.target.value)} placeholder="0.00" step="0.01"
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Prioridade</label>
                  <div className="flex gap-2">
                    {([["low", "Baixa"], ["medium", "Média"], ["high", "Alta"]] as const).map(([val, label]) => (
                      <button key={val} onClick={() => setShopPriority(val)} className={`flex-1 py-2 rounded-xl text-sm transition ${shopPriority === val ? (val === 'high' ? 'bg-red-500 text-white' : val === 'medium' ? 'bg-yellow-500 text-white' : 'bg-gray-500 text-white') : 'bg-[#2a2a2a] text-gray-400'}`}>{label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Link (opcional)</label>
                  <input type="url" value={shopLink} onChange={e => setShopLink(e.target.value)} placeholder="https://..."
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Observações</label>
                  <input type="text" value={shopNotes} onChange={e => setShopNotes(e.target.value)} placeholder="Opcional..."
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={closeModal} className="flex-1 bg-[#2a2a2a] text-gray-300 py-3 rounded-xl font-medium hover:bg-[#333] transition">Cancelar</button>
                  <button onClick={saveShopping} disabled={isSaving} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition disabled:opacity-50">
                    {isSaving ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}

            {/* Rule Modal */}
            {modalType === "rule" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Categoria</label>
                  <div className="flex gap-2 flex-wrap">
                    {expenseCategories.map(cat => (
                      <button key={cat} onClick={() => setRuleCategory(cat)} className={`px-3 py-2 rounded-xl text-sm transition ${ruleCategory === cat ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Limite mensal (R$) *</label>
                  <input type="number" value={ruleLimit} onChange={e => setRuleLimit(e.target.value)} placeholder="0.00" step="0.01"
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Alertar em (%)</label>
                  <input type="number" value={ruleAlert} onChange={e => setRuleAlert(e.target.value)} min="1" max="100"
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                  <p className="text-xs text-gray-500 mt-1">Alerta quando atingir {ruleAlert}% do limite</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={closeModal} className="flex-1 bg-[#2a2a2a] text-gray-300 py-3 rounded-xl font-medium hover:bg-[#333] transition">Cancelar</button>
                  <button onClick={saveRule} disabled={isSaving} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition disabled:opacity-50">
                    {isSaving ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}

            {/* Note Modal */}
            {modalType === "note" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Título *</label>
                  <input type="text" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Ex: Lembrete, Planejamento..."
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Conteúdo</label>
                  <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Escreva sua nota..."
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition h-24 resize-none" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Cor</label>
                  <div className="flex gap-2">
                    {["#FBBF24", "#EF4444", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"].map(c => (
                      <button key={c} onClick={() => setNoteColor(c)} className={`w-8 h-8 rounded-full transition ${noteColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={closeModal} className="flex-1 bg-[#2a2a2a] text-gray-300 py-3 rounded-xl font-medium hover:bg-[#333] transition">Cancelar</button>
                  <button onClick={saveNote} disabled={isSaving} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition disabled:opacity-50">
                    {isSaving ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
