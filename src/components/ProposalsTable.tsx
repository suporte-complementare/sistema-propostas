import { useState, useEffect } from "react";
import { Proposal, ProposalStatus } from "@/types/proposal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Edit, Trash2, Search, ArrowUpDown, Check, X, Clock, 
  AlertTriangle, AlertCircle, Filter, ChevronLeft, ChevronRight, Archive, RefreshCcw, CalendarDays
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProposalsTableProps {
  proposals: Proposal[];
  onEdit: (proposal: Proposal) => void;
  onDelete: (id: string) => void;
  onBulkStatusChange?: (ids: string[], newStatus: ProposalStatus) => void;
  onArchive: (id: string, archive: boolean) => void;
  onBulkArchive: (ids: string[], archive: boolean) => void;
  isArchivedView: boolean;
}

type SortField = "status" | "lastFollowUp" | "expectedReturnDate" | "value" | "sentDate" | "clientName";
type SortDirection = "asc" | "desc";

export const ProposalsTable = ({
  proposals,
  onEdit,
  onDelete,
  onBulkStatusChange,
  onArchive,
  onBulkArchive,
  isArchivedView,
}: ProposalsTableProps) => {
  // --- ESTADOS DE CONTROLE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // --- ORDENAÇÃO ---
  const [sortField, setSortField] = useState<SortField | null>(() => {
    const savedField = localStorage.getItem("proposals_sortField");
    return (savedField as SortField) || null;
  });

  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const savedDirection = localStorage.getItem("proposals_sortDirection");
    return (savedDirection as SortDirection) || "asc";
  });

  useEffect(() => {
    if (sortField) localStorage.setItem("proposals_sortField", sortField);
    else localStorage.removeItem("proposals_sortField");
    localStorage.setItem("proposals_sortDirection", sortDirection);
  }, [sortField, sortDirection]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  const [showFilters, setShowFilters] = useState(false);
  
  // --- NOVOS ESTADOS DE FILTRO ---
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [valueMin, setValueMin] = useState("");
  const [valueMax, setValueMax] = useState("");
  const [periodPreset, setPeriodPreset] = useState("all");

  // --- LÓGICA DE DATAS INTELIGENTE ---
  const handlePeriodChange = (value: string) => {
    setPeriodPreset(value);
    
    if (value === "all") {
      setDateStart("");
      setDateEnd("");
      return;
    }

    const today = new Date();
    // Função para ajustar fuso horário local (evita erro de dia anterior)
    const getLocalISO = (d: Date) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };

    let start = new Date();
    let end = new Date();

    switch (value) {
      case "today":
        // Início e Fim são hoje
        break;
      case "last-7":
        start.setDate(today.getDate() - 7);
        break;
      case "last-30":
        start.setDate(today.getDate() - 30);
        break;
      case "last-3-months":
        start.setMonth(today.getMonth() - 3);
        break;
      case "last-12-months":
        start.setFullYear(today.getFullYear() - 1);
        break;
      case "this-month":
        start.setDate(1); // Dia 1 do mês atual
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Último dia do mês atual
        break;
      case "mtd": // Mês até a data
        start.setDate(1);
        break;
      case "qtd": // Trimestre até a data
        const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
        start = new Date(today.getFullYear(), quarterMonth, 1);
        break;
      case "ytd": // Ano até a data
        start = new Date(today.getFullYear(), 0, 1);
        break;
    }

    setDateStart(getLocalISO(start));
    setDateEnd(getLocalISO(end));
  };

  // --- FUNÇÕES AUXILIARES VISUAIS ---
  const getStatusBadge = (status: ProposalStatus) => {
    const statusConfig = {
      pending: { label: "Aguardando", variant: "outline" as const, className: "border-slate-400 text-slate-600 bg-white/50" },
      approved: { label: "Aprovada", variant: "outline" as const, className: "border-green-600 text-green-700 bg-green-50" },
      rejected: { label: "Recusada", variant: "outline" as const, className: "border-red-400 text-red-600 bg-red-50" },
    };
    const config = statusConfig[status];
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (date?: Date) => (!date ? "-" : new Intl.DateTimeFormat("pt-BR").format(date));
  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  
  const getDaysSinceFollowUp = (date: Date) => Math.ceil(Math.abs(new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  const getFollowUpIcon = (days: number) => {
    if (days > 90) return <AlertTriangle className="h-4 w-4 text-[#25515c] inline mr-1" />;
    if (days > 30) return <AlertCircle className="h-4 w-4 text-[#25515c] inline mr-1" />;
    return null;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // --- FILTRAGEM ---
  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch = proposal.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesDate = true;
    
    // Comparação de datas considerando apenas o dia (zerando horas)
    const proposalDate = new Date(proposal.sentDate);
    proposalDate.setHours(0,0,0,0);

    if (dateStart) {
      const start = new Date(dateStart);
      start.setHours(0,0,0,0); // Ajuste fuso
      start.setDate(start.getDate() + 1); // Compensação comum em inputs date
      matchesDate = matchesDate && proposalDate >= new Date(dateStart); 
      // Nota: Comparação direta de string ISO 'YYYY-MM-DD' costuma funcionar bem também
      // Simplificando para string para evitar problemas de fuso na filtragem:
      matchesDate = matchesDate && proposal.sentDate.toISOString().split('T')[0] >= dateStart;
    }
    if (dateEnd) {
      matchesDate = matchesDate && proposal.sentDate.toISOString().split('T')[0] <= dateEnd;
    }

    let matchesValue = true;
    if (valueMin) matchesValue = matchesValue && proposal.value >= Number(valueMin);
    if (valueMax) matchesValue = matchesValue && proposal.value <= Number(valueMax);
    return matchesSearch && matchesDate && matchesValue;
  });

  const sortedProposals = [...filteredProposals].sort((a, b) => {
    if (!sortField) return 0;
    let comparison = 0;
    if (sortField === "status") {
      const statusOrder = { pending: 0, approved: 1, rejected: 2 };
      comparison = statusOrder[a.status] - statusOrder[b.status];
    } else if (sortField === "lastFollowUp") comparison = a.lastFollowUp.getTime() - b.lastFollowUp.getTime();
    else if (sortField === "expectedReturnDate") comparison = (a.expectedReturnDate?.getTime() ?? 0) - (b.expectedReturnDate?.getTime() ?? 0);
    else if (sortField === "value") comparison = a.value - b.value;
    else if (sortField === "sentDate") comparison = a.sentDate.getTime() - b.sentDate.getTime();
    else if (sortField === "clientName") comparison = a.clientName.localeCompare(b.clientName);
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProposals = sortedProposals.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedProposals.length / itemsPerPage);

  const toggleSelectAll = (checked: boolean) => checked ? setSelectedIds(paginatedProposals.map((p) => p.id)) : setSelectedIds([]);
  const toggleSelectOne = (id: string) => selectedIds.includes(id) ? setSelectedIds(selectedIds.filter((sid) => sid !== id)) : setSelectedIds([...selectedIds, id]);

  const executeBulkAction = (newStatus: ProposalStatus) => {
    if (onBulkStatusChange && selectedIds.length > 0) {
      onBulkStatusChange(selectedIds, newStatus);
      setSelectedIds([]);
    }
  };

  const executeBulkArchive = () => {
    if (selectedIds.length > 0) {
      onBulkArchive(selectedIds, !isArchivedView);
      setSelectedIds([]);
    }
  };

  return (
    <>
      <Card className="p-6 border-slate-200 shadow-sm space-y-4">
        {/* TOPO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10 border-slate-300 focus:border-[#25515c] focus:ring-[#25515c]"
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`${showFilters ? 'bg-slate-100' : ''} border-slate-300`}>
              <Filter className="h-4 w-4 mr-2" /> Filtros
            </Button>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-[#E4F4F0] p-2 rounded-md animate-in fade-in slide-in-from-top-1 border border-[#CBEAE2] w-full md:w-auto justify-center flex-wrap">
              <span className="text-sm font-medium px-2 text-[#25515c]">{selectedIds.length} selecionados</span>
              <div className="h-4 w-[1px] bg-[#25515c]/20 mx-1" />
              {!isArchivedView && (
                <>
                  <Button size="sm" variant="ghost" className="text-green-700 hover:bg-green-100" onClick={() => executeBulkAction('approved')}><Check className="w-4 h-4 mr-1" /> Aprovar</Button>
                  <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-100" onClick={() => executeBulkAction('rejected')}><X className="w-4 h-4 mr-1" /> Recusar</Button>
                  <Button size="sm" variant="ghost" className="text-slate-700 hover:bg-slate-200" onClick={() => executeBulkAction('pending')}><Clock className="w-4 h-4 mr-1" /> Aguardar</Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="text-slate-700 hover:bg-slate-200" onClick={executeBulkArchive}>
                {isArchivedView ? <RefreshCcw className="w-4 h-4 mr-1" /> : <Archive className="w-4 h-4 mr-1" />}
                {isArchivedView ? "Restaurar" : "Arquivar"}
              </Button>
            </div>
          )}
        </div>

        {/* ÁREA DE FILTROS AVANÇADOS */}
        {showFilters && (
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 animate-in slide-in-from-top-2 space-y-4">
            
            {/* LINHA 1: Filtros de Período */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <label className="text-xs font-semibold text-slate-500 mb-1 block flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Período Rápido
                </label>
                <Select value={periodPreset} onValueChange={handlePeriodChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione um período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tudo</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="last-7">Últimos 7 dias</SelectItem>
                    <SelectItem value="last-30">Últimos 30 dias</SelectItem>
                    <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
                    <SelectItem value="last-12-months">Últimos 12 meses</SelectItem>
                    <SelectItem value="this-month">Esse Mês</SelectItem>
                    <SelectItem value="mtd">Mês até a data (MTD)</SelectItem>
                    <SelectItem value="qtd">Trimestre até a data (QTD)</SelectItem>
                    <SelectItem value="ytd">Ano até a data (YTD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtros Manuais (Preenchidos automaticamente ou manualmente) */}
              <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Início</label><Input type="date" value={dateStart} onChange={(e) => { setDateStart(e.target.value); setPeriodPreset("custom"); }} className="bg-white" /></div>
              <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Fim</label><Input type="date" value={dateEnd} onChange={(e) => { setDateEnd(e.target.value); setPeriodPreset("custom"); }} className="bg-white" /></div>
              
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs font-semibold text-slate-500 mb-1 block">Min (R$)</label><Input type="number" placeholder="0" value={valueMin} onChange={(e) => setValueMin(e.target.value)} className="bg-white" /></div>
                <div className="flex-1"><label className="text-xs font-semibold text-slate-500 mb-1 block">Max (R$)</label><Input type="number" placeholder="0" value={valueMax} onChange={(e) => setValueMax(e.target.value)} className="bg-white" /></div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setPeriodPreset("all"); setDateStart(""); setDateEnd(""); setValueMin(""); setValueMax(""); }} className="text-slate-500 text-xs hover:text-red-500">
                Limpar Todos os Filtros
              </Button>
            </div>
          </div>
        )}

        {/* TABELA */}
        <div className="rounded-md border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b-slate-200 hover:bg-slate-50">
                <TableHead className="w-[40px]"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[#25515c] focus:ring-[#25515c]" checked={paginatedProposals.length > 0 && selectedIds.length === paginatedProposals.length} onChange={(e) => toggleSelectAll(e.target.checked)} /></TableHead>
                <TableHead className="font-bold cursor-pointer hover:text-[#25515c]" onClick={() => handleSort("clientName")}>Cliente <ArrowUpDown className="h-3 w-3 inline" /></TableHead>
                <TableHead className="font-bold cursor-pointer hover:text-[#25515c]" onClick={() => handleSort("sentDate")}>Data <ArrowUpDown className="h-3 w-3 inline" /></TableHead>
                <TableHead className="font-bold">Via</TableHead>
                <TableHead className="font-bold cursor-pointer hover:text-[#25515c]" onClick={() => handleSort("value")}>Valor <ArrowUpDown className="h-3 w-3 inline" /></TableHead>
                <TableHead><Button variant="ghost" size="sm" className="h-8 gap-1 font-bold hover:text-[#25515c]" onClick={() => handleSort("status")}>Status <ArrowUpDown className="h-3 w-3" /></Button></TableHead>
                <TableHead><Button variant="ghost" size="sm" className="h-8 gap-1 font-bold hover:text-[#25515c]" onClick={() => handleSort("lastFollowUp")}>Follow-up <ArrowUpDown className="h-3 w-3" /></Button></TableHead>
                <TableHead><Button variant="ghost" size="sm" className="h-8 gap-1 font-bold hover:text-[#25515c]" onClick={() => handleSort("expectedReturnDate")}>Previsão <ArrowUpDown className="h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right font-bold">Opções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProposals.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-slate-500">Nenhuma proposta encontrada.</TableCell></TableRow>
              ) : (
                paginatedProposals.map((proposal) => {
                  const isSelected = selectedIds.includes(proposal.id);
                  const daysSince = getDaysSinceFollowUp(proposal.lastFollowUp);
                  const rowClassName = isSelected ? "bg-[#25515c]/10 border-l-4 border-l-[#25515c]" : "border-b border-white/50 hover:bg-slate-50";

                  return (
                    <TableRow key={proposal.id} className={rowClassName}>
                      <TableCell><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[#25515c] focus:ring-[#25515c]" checked={isSelected} onChange={() => toggleSelectOne(proposal.id)} /></TableCell>
                      <TableCell className="font-semibold">{proposal.clientName}</TableCell>
                      <TableCell>{formatDate(proposal.sentDate)}</TableCell>
                      <TableCell className="text-sm">{proposal.sentVia || "-"}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(proposal.value)}</TableCell>
                      <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            {proposal.status === 'pending' && getFollowUpIcon(daysSince)}
                            <span className="font-medium">{formatDate(proposal.lastFollowUp)}</span>
                          </div>
                          {proposal.status === 'pending' && <span className="text-[10px] opacity-80 font-bold uppercase tracking-wide">{daysSince} dias</span>}
                        </div>
                      </TableCell>
                      <TableCell>{proposal.expectedReturnDate ? formatDate(proposal.expectedReturnDate) : "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onArchive(proposal.id, !isArchivedView)} className="hover:bg-slate-200" title={isArchivedView ? "Restaurar" : "Arquivar"}>
                            {isArchivedView ? <RefreshCcw className="h-4 w-4 opacity-70" /> : <Archive className="h-4 w-4 opacity-70" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onEdit(proposal)} className="hover:bg-blue-100 hover:text-blue-600"><Edit className="h-4 w-4 opacity-70" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(proposal.id)} className="hover:bg-red-100 hover:text-red-600"><Trash2 className="h-4 w-4 opacity-70" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
           <div className="text-sm text-slate-500">Mostrando {startIndex + 1} até {Math.min(startIndex + itemsPerPage, sortedProposals.length)} de {sortedProposals.length} propostas</div>
           <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4 mr-1" /> Anterior</Button>
             <span className="text-sm font-medium text-slate-700">Pág {currentPage} de {Math.max(totalPages, 1)}</span>
             <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>Próximo <ChevronRight className="h-4 w-4 ml-1" /></Button>
           </div>
        </div>
      </Card>
      
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza? Isso apagará o registro permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
