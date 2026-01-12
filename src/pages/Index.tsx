import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, LogOut, Lock, Archive, LayoutList } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { ProposalsTable } from "@/components/ProposalsTable";
import { ProposalDialog } from "@/components/ProposalDialog";
import { Proposal, ProposalStatus } from "@/types/proposal";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";

const Index = () => {
  // --- AUTENTICAÇÃO ---
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- ESTADOS ---
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | undefined>();
  
  // NOVO: Estado para alternar entre "Ativas" e "Arquivadas"
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchProposals();
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Bem-vindo de volta!");
    } catch (error: any) {
      toast.error("Erro ao entrar.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info("Você saiu do sistema.");
    setProposals([]);
  };

  const fetchProposals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('sent_date', { ascending: false });

      if (error) throw error;

      const formattedProposals: Proposal[] = data.map((p: any) => ({
        id: p.id,
        clientName: p.client_name,
        sentDate: new Date(p.sent_date),
        value: Number(p.value),
        status: p.status,
        sentVia: p.sent_via,
        lastFollowUp: p.last_follow_up ? new Date(p.last_follow_up) : undefined,
        expectedReturnDate: p.expected_return_date ? new Date(p.expected_return_date) : undefined,
        notes: p.notes,
        archived: p.archived || false, // Mapeia o campo novo
      }));

      setProposals(formattedProposals);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setIsLoading(false);
    }
  };

  // CRUD
  const handleAddProposal = async (proposal: Omit<Proposal, "id">) => {
    try {
      const { error } = await supabase.from('proposals').insert({
        client_name: proposal.clientName,
        sent_date: proposal.sentDate.toISOString(),
        value: proposal.value,
        status: proposal.status,
        sent_via: proposal.sentVia,
        last_follow_up: proposal.lastFollowUp?.toISOString(),
        expected_return_date: proposal.expectedReturnDate?.toISOString(),
        notes: proposal.notes,
        archived: false // Padrão
      });
      if (error) throw error;
      toast.success("Salvo com sucesso!");
      fetchProposals();
      setIsDialogOpen(false);
    } catch (error) { toast.error("Erro ao salvar."); }
  };

  const handleEditProposal = async (proposal: Proposal) => {
    try {
      const { error } = await supabase.from('proposals').update({
        client_name: proposal.clientName,
        sent_date: proposal.sentDate.toISOString(),
        value: proposal.value,
        status: proposal.status,
        sent_via: proposal.sentVia,
        last_follow_up: proposal.lastFollowUp?.toISOString(),
        expected_return_date: proposal.expectedReturnDate?.toISOString(),
        notes: proposal.notes
        // Não atualizamos o archived aqui para não sumir sem querer
      }).eq('id', proposal.id);
      if (error) throw error;
      toast.success("Atualizado!");
      fetchProposals();
      setIsDialogOpen(false);
    } catch (error) { toast.error("Erro ao atualizar."); }
  };

  const handleDeleteProposal = async (id: string) => {
    try {
      const { error } = await supabase.from('proposals').delete().eq('id', id);
      if (error) throw error;
      toast.success("Excluído permanentemente.");
      fetchProposals();
    } catch (error) { toast.error("Erro ao excluir."); }
  };

  const handleBulkStatusChange = async (ids: string[], newStatus: ProposalStatus) => {
    try {
      const { error } = await supabase.from('proposals').update({ status: newStatus }).in('id', ids);
      if (error) throw error;
      toast.success("Status em massa atualizado!");
      fetchProposals();
    } catch (error) { toast.error("Erro na atualização em massa."); }
  };

  // NOVA FUNÇÃO: Arquivar ou Restaurar
  const handleArchiveProposal = async (id: string, archive: boolean) => {
    try {
      const { error } = await supabase.from('proposals').update({ archived: archive }).eq('id', id);
      if (error) throw error;
      toast.success(archive ? "Proposta arquivada!" : "Proposta restaurada!");
      fetchProposals();
    } catch (error) { toast.error("Erro ao arquivar/restaurar."); }
  };

  const handleBulkArchive = async (ids: string[], archive: boolean) => {
    try {
      const { error } = await supabase.from('proposals').update({ archived: archive }).in('id', ids);
      if (error) throw error;
      toast.success(archive ? "Propostas arquivadas!" : "Propostas restauradas!");
      fetchProposals();
    } catch (error) { toast.error("Erro na ação em massa."); }
  };

  // Lógica de visualização
  const displayedProposals = proposals.filter(p => !!p.archived === showArchived);

  if (!session) {
    if (authLoading) return null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border">
          <div className="text-center flex flex-col items-center">
            <div className="bg-primary/10 p-3 rounded-full mb-4"><Lock className="h-8 w-8 text-primary" /></div>
            <img src={logo} alt="Logo" className="h-12 w-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
            <p className="mt-2 text-sm text-gray-600">Entre com suas credenciais da Complementare</p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div><Label htmlFor="email">E-mail Corporativo</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
              <div><Label htmlFor="password">Senha</Label><Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" /></div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoggingIn}>{isLoggingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</> : "Acessar Sistema"}</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans pb-20">
      <div className="fixed -bottom-20 -right-20 pointer-events-none z-0 opacity-[0.03]">
        <img src={logo} alt="Marca d'água" className="w-[50vw] max-w-[800px] h-auto grayscale transform rotate-[-10deg]" />
      </div>

      <header className="border-b border-border bg-card relative z-10">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col gap-8">
            <div className="w-full flex justify-center"><img src={logo} alt="Complementare Logo" className="h-24 w-auto object-contain" /></div>
            <div className="flex flex-col md:flex-row items-end justify-between gap-6">
              <div className="w-full text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Controle de Propostas</h1>
                <p className="mt-2 text-base text-muted-foreground">Gerenciamento de projetos complementares de engenharia</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2 shadow-sm w-full md:w-auto bg-[#25515c] hover:bg-[#1e424b]"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Nova Proposta</span><span className="sm:hidden">Nova</span></Button>
                <Button variant="outline" size="icon" onClick={handleLogout} title="Sair" className="border-slate-300"><LogOut className="h-4 w-4 text-slate-600" /></Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8 relative z-10">
        {isLoading ? (
          <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-2">Carregando dados...</span></div>
        ) : (
          <>
            {/* SELETOR DE VISTA (Abas) */}
            <div className="flex items-center gap-2 border-b border-gray-200">
              <button 
                onClick={() => setShowArchived(false)}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${!showArchived ? 'border-[#25515c] text-[#25515c]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutList className="h-4 w-4" />
                Propostas Ativas
              </button>
              <button 
                onClick={() => setShowArchived(true)}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${showArchived ? 'border-[#25515c] text-[#25515c]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Archive className="h-4 w-4" />
                Arquivo Morto
              </button>
            </div>

            {/* Passamos apenas as propostas filtradas para o Dashboard e Tabela */}
            <Dashboard proposals={displayedProposals} />
            
            <ProposalsTable
              proposals={displayedProposals}
              onEdit={(p) => { setEditingProposal(p); setIsDialogOpen(true); }}
              onDelete={handleDeleteProposal}
              onBulkStatusChange={handleBulkStatusChange}
              onArchive={handleArchiveProposal} // Nova função
              onBulkArchive={handleBulkArchive} // Nova função
              isArchivedView={showArchived} // Novo estado
            />
          </>
        )}
      </main>

      <ProposalDialog
        open={isDialogOpen}
        onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingProposal(undefined); }}
        onSave={editingProposal ? handleEditProposal : handleAddProposal}
        proposal={editingProposal}
      />
    </div>
  );
};

export default Index;
