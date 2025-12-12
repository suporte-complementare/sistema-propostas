import { useState } from "react";
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
  Edit, Trash2, Search, ArrowUpDown, Check, X, Clock, 
  AlertTriangle, AlertCircle, Filter, ChevronLeft, ChevronRight 
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
}

// ADICIONAMOS "clientName" AQUI NA LISTA DE ORDENAÇÃO
type SortField = "status" | "lastFollowUp" | "expectedReturnDate" | "value" | "sentDate" | "clientName";
type SortDirection = "asc" | "desc";

export const ProposalsTable = ({
  proposals,
  onEdit,
  onDelete,
  onBulkStatusChange,
}: ProposalsTableProps) => {
  // --- ESTADOS DE CONTROLE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // --- ESTADOS DE PAGINAÇÃO E FILTROS ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; // Define 100 itens por página
  const [showFilters, setShowFilters] = useState(false);
  
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [valueMin, setValueMin] = useState("");
  const [valueMax, setValueMax] = useState("");

  // --- FUNÇÕES AUXILIARES ---
  const getStatusBadge = (status: ProposalStatus) => {
    const statusConfig = {
      pending: {
        label: "Aguardando",
        variant: "outline" as const,
        className: "border-slate-400 text-slate-600 font-medium bg-white/50",
      },
      approved: {
        label: "Aprovada",
        variant: "outline" as const,
        className: "border-green-600 text-green-700 font-medium bg-green-50",
      },
      rejected: {
        label: "Recusada",
        variant: "outline" as const,
        className: "border-red-400 text-red-600 font-medium bg-red-50",
      },
    };
    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date?: Date) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("pt-BR").format(date);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getDaysSinceFollowUp = (date: Date) => {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getFollowUpStyle = (lastFollowUp: Date, status: ProposalStatus) => {
    if (status !== 'pending') return "";
    const days = getDaysSinceFollowUp(lastFollowUp);
    if (days <= 15) return "bg-[#E4F4F0] text-[#25515c] hover:bg-[#d5ebe5]";
    else if (days <= 30) return "bg-[#CBEAE2] text-[#0e6e7c] hover:bg-[#bce0d6]";
    else if (days <= 90) return "bg-[#E5F2F6] text-[#25515c] hover:bg-[#dcebf0]";
    else return "bg-[#D8E3E6] text-[#25515c] hover:bg-[#cedce0]";
  };

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

  // --- LÓGICA DE FILTRAGEM ---
  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch = proposal.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (dateStart) {
      matchesDate = matchesDate && new Date(proposal.sentDate) >= new Date(dateStart);
    }
    if (dateEnd) {
      matchesDate = matchesDate && new Date(proposal.sentDate) <= new Date(dateEnd);
    }

    let matchesValue = true;
    if (valueMin) {
      matchesValue = matchesValue && proposal.value >= Number(valueMin);
    }
    if (valueMax) {
      matchesValue = matchesValue && proposal.value <= Number(valueMax);
    }

    return matchesSearch && matchesDate && matchesValue;
  });

  // --- LÓGICA DE ORDENAÇÃO ---
  const sortedProposals = [...filteredProposals].sort((a, b) => {
    if (!sortField) return 0;
    let comparison = 0;
    
    if (sortField === "status") {
      const statusOrder = { pending: 0, approved: 1, rejected: 2 };
      comparison = statusOrder[a.status] - statusOrder[b.status];
    } else if (sortField === "lastFollowUp") {
      comparison = a.lastFollowUp.getTime() - b.lastFollowUp.getTime();
    } else if (sortField === "expectedReturnDate") {
      const aDate = a.expectedReturnDate?.getTime() ?? Infinity;
      const bDate = b.expectedReturnDate?.getTime() ?? Infinity;
      comparison = aDate - bDate;
    } else if (sortField === "value") {
      comparison = a.value - b.value;
    } else if (sortField === "sentDate") {
      comparison = a.sentDate.getTime() - b.sentDate.getTime();
    } else if (sortField === "clientName") {
      // ORDENAÇÃO DE A-Z PARA CLIENTES
      comparison = a.clientName.localeCompare(b.clientName);
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // --- PAGINAÇÃO ---
  const totalPages = Math.ceil(sortedProposals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProposals = sortedProposals.slice(startIndex, startIndex + itemsPerPage);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedProposals.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const executeBulkAction = (newStatus: ProposalStatus) => {
    if (onBulkStatusChange && selectedIds.length > 0) {
      onBulkStatusChange(selectedIds, newStatus);
      setSelectedIds([]);
    }
  };

  return (
    <>
      <Card className="p-6 border-slate-200 shadow-sm space-y-4">
        {/* TOPO: Busca e Botão de Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 border-slate-300 focus:border-[#25515c] focus:ring-[#25515c]"
              />
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className={`${showFilters ? 'bg-slate-100' : ''} border-slate-300`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Ações em Massa */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-[#E4F4F0] p-2 rounded-md animate-in fade-in slide-in-from-top-1 border border-[#CBEAE2] w-full md:w-auto justify-center">
              <span className="text-sm font-medium px-2 text-[#25515c]">
                {selectedIds.length} selecionados
              </span>
              <div className="h-4 w-[1px] bg-[#25515c]/20 mx-1" />
              <Button size="sm" variant="ghost" className="text-green-700 hover:bg-green-100" onClick={() => executeBulkAction('approved')}>
                <Check className="w-4 h-4 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-100" onClick={() => executeBulkAction('rejected')}>
                <X className="w-4 h-4 mr-1" /> Recusar
              </Button>
               <Button size="sm" variant="ghost" className="text-slate-700 hover:bg-slate-200" onClick={() => executeBulkAction('pending')}>
                <Clock className="w-4 h-4 mr-1" /> Aguardar
              </Button>
            </div>
          )}
        </div>

        {/* ÁREA DE FILTROS AVANÇADOS (Escondida até clicar no botão Filtros) */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in slide-in-from-top-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Data Envio (De)</label>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Data Envio (Até)</label>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Valor Mín (R$)</label>
              <Input type="number" placeholder="0.00" value={valueMin} onChange={(e) => setValueMin(e.target.value)} className="bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Valor Máx (R$)</label>
              <Input type="number" placeholder="0.00" value={valueMax} onChange={(e) => setValueMax(e.target.value)} className="bg-white" />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => {
                setDateStart(""); setDateEnd(""); setValueMin(""); setValueMax("");
              }} className="text-slate-500 text-xs hover:text-red-500">
                Limpar Filtros
              </Button>
            </div>
          </div>
        )}

        {/* TABELA */}
        <div className="rounded-md border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b-slate-200 hover:bg-slate-50">
                <TableHead className="w-[40px]">
                  <input 
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-[#25515c] focus:ring-[#25515c]"
                    checked={paginatedProposals.length > 0 && selectedIds.length === paginatedProposals.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </TableHead>
                
                {/* CABEÇALHO CLIENTE COM CLASSIFICAÇÃO */}
                <TableHead className="text-slate-700 font-bold cursor-pointer hover:text-[#25515c]" onClick={() => handleSort("clientName")}>
                  Cliente <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>

                <TableHead className="text-slate-700 font-bold cursor-pointer hover:text-[#25515c]" onClick={() => handleSort("sentDate")}>
                  Data Envio <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-slate-700 font-bold">Via</TableHead>
                <TableHead className="text-slate-700 font-bold cursor-pointer hover:text-[#25515c]" onClick={() => handleSort("value")}>
                  Valor <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 font-bold text-slate-700 hover:text-[#25515c]" onClick={() => handleSort("status")}>
                    Status <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 font-bold text-slate-700 hover:text-[#25515c]" onClick={() => handleSort("lastFollowUp")}>
                    Follow-up <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 font-bold text-slate-700 hover:text-[#25515c]" onClick={() => handleSort("expectedReturnDate")}>
                    Previsão <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                {/* MUDANÇA VISUAL AQUI: DE "Ações" PARA "Opções" */}
                <TableHead className="text-right text-slate-700 font-bold">Opções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                    Nenhuma proposta encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProposals.map((proposal) => {
                  const isSelected = selectedIds.includes(proposal.id);
                  const followUpStyle = getFollowUpStyle(proposal.lastFollowUp, proposal.status);
                  const daysSince = getDaysSinceFollowUp(proposal.lastFollowUp);
                  
                  const rowClassName = isSelected 
                    ? "bg-[#25515c]/10 border-l-4 border-l-[#25515c]" 
                    : `${followUpStyle} border-b border-white/50`;

                  return (
                    <TableRow key={proposal.id} className={rowClassName}>
                      <TableCell>
                        <input 
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-[#25515c] focus:ring-[#25515c]"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(proposal.id)}
                        />
                      </TableCell>
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
                          {proposal.status === 'pending' && (
                            <span className="text-[10px] opacity-80 font-bold uppercase tracking-wide">
                              {daysSince} dias
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                         {proposal.expectedReturnDate ? formatDate(proposal.expectedReturnDate) : "-"}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(proposal)} className="hover:bg-white/50">
                            <Edit className="h-4 w-4 opacity-70" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(proposal.id)} className="hover:bg-red-100 hover:text-red-600">
                            <Trash2 className="h-4 w-4 opacity-70" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* RODAPÉ DE PAGINAÇÃO */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-sm text-slate-500">
            Mostrando {startIndex + 1} até {Math.min(startIndex + itemsPerPage, sortedProposals.length)} de {sortedProposals.length} propostas
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="border-slate-200"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <span className="text-sm font-medium text-slate-700 min-w-[3rem] text-center">
              Pág {currentPage} de {Math.max(totalPages, 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="border-slate-200"
            >
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
