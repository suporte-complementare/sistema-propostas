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
import { Edit, Trash2, Search, AlertCircle, ArrowUpDown, Check, X, Clock } from "lucide-react";
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
  // Nova propriedade para receber a função de ações em massa
  onBulkStatusChange?: (ids: string[], newStatus: ProposalStatus) => void;
}

type SortField = "status" | "lastFollowUp" | "expectedReturnDate";
type SortDirection = "asc" | "desc";

export const ProposalsTable = ({
  proposals,
  onEdit,
  onDelete,
  onBulkStatusChange,
}: ProposalsTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // ESTADO DE SELEÇÃO MÚLTIPLA: Guarda os IDs das propostas marcadas
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const getStatusBadge = (status: ProposalStatus) => {
    const statusConfig = {
      pending: {
        label: "Aguardando",
        variant: "outline" as const,
        className: "border-alert-attention bg-alert-attention/10 text-alert-attention font-medium",
      },
      approved: {
        label: "Aprovada",
        variant: "outline" as const,
        className: "border-success bg-success/10 text-success font-medium",
      },
      rejected: {
        label: "Recusada",
        variant: "outline" as const,
        className: "border-destructive bg-destructive/10 text-destructive font-medium",
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysUntilReturn = (date?: Date) => {
    if (!date) return null;
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const needsFollowUp = (proposal: Proposal) => {
    return (
      proposal.status === "pending" && getDaysSinceFollowUp(proposal.lastFollowUp) > 7
    );
  };

  const isReturnOverdue = (proposal: Proposal) => {
    if (!proposal.expectedReturnDate) return false;
    const daysUntil = getDaysUntilReturn(proposal.expectedReturnDate);
    return daysUntil !== null && daysUntil < 0;
  };

  const isReturnSoon = (proposal: Proposal) => {
    if (!proposal.expectedReturnDate) return false;
    const daysUntil = getDaysUntilReturn(proposal.expectedReturnDate);
    return daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // --- LÓGICA DE SELEÇÃO ---
  
  // Selecionar ou Deselecionar TUDO
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProposals.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Selecionar ou Deselecionar UM
  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Executar a ação
  const executeBulkAction = (newStatus: ProposalStatus) => {
    if (onBulkStatusChange && selectedIds.length > 0) {
      onBulkStatusChange(selectedIds, newStatus);
      setSelectedIds([]); // Limpa seleção após ação
    }
  };

  const filteredProposals = proposals.filter((proposal) =>
    proposal.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* BARRA DE AÇÕES EM MASSA (Só aparece quando algo é selecionado) */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-muted p-2 rounded-md animate-in fade-in slide-in-from-top-1">
              <span className="text-sm font-medium px-2">
                {selectedIds.length} selecionados
              </span>
              <div className="h-4 w-[1px] bg-border mx-1" />
              <Button 
                size="sm" 
                variant="outline" 
                className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                onClick={() => executeBulkAction('approved')}
              >
                <Check className="w-4 h-4 mr-1" /> Aprovar
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => executeBulkAction('rejected')}
              >
                <X className="w-4 h-4 mr-1" /> Recusar
              </Button>
               <Button 
                size="sm" 
                variant="outline"
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                onClick={() => executeBulkAction('pending')}
              >
                <Clock className="w-4 h-4 mr-1" /> Aguardar
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-table-header hover:bg-table-header border-b-0">
                {/* CHECKBOX CABEÇALHO */}
                <TableHead className="w-[40px]">
                  <input 
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={sortedProposals.length > 0 && selectedIds.length === sortedProposals.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </TableHead>
                <TableHead className="text-table-header-foreground font-semibold">Cliente</TableHead>
                <TableHead className="text-table-header-foreground font-semibold">Data de Envio</TableHead>
                <TableHead className="text-table-header-foreground font-semibold">Enviado por</TableHead>
                <TableHead className="text-table-header-foreground font-semibold">Valor</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-table-header-foreground hover:text-table-header-foreground hover:bg-table-header-foreground/10 font-semibold"
                    onClick={() => handleSort("status")}
                  >
                    Status
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-table-header-foreground hover:text-table-header-foreground hover:bg-table-header-foreground/10 font-semibold"
                    onClick={() => handleSort("lastFollowUp")}
                  >
                    Último Follow-up
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-table-header-foreground hover:text-table-header-foreground hover:bg-table-header-foreground/10 font-semibold"
                    onClick={() => handleSort("expectedReturnDate")}
                  >
                    Previsão de Retorno
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right text-table-header-foreground font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhuma proposta encontrada
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                sortedProposals.map((proposal) => {
                  const isOverdue = isReturnOverdue(proposal);
                  const isSoon = isReturnSoon(proposal);
                  const needsAlert = needsFollowUp(proposal);
                  const isSelected = selectedIds.includes(proposal.id);
                  
                  let rowClassName = isSelected ? "bg-primary/5 " : "";
                  
                  // Mantém as cores de alerta, mas suave se selecionado
                  if (isOverdue) {
                    rowClassName += "border-l-4 border-l-alert-overdue " + (isSelected ? "bg-alert-overdue/10" : "bg-alert-overdue/5 hover:bg-alert-overdue/10");
                  } else if (isSoon) {
                    rowClassName += "border-l-4 border-l-alert-soon " + (isSelected ? "bg-alert-soon/10" : "bg-alert-soon/5 hover:bg-alert-soon/10");
                  } else if (needsAlert) {
                    rowClassName += "border-l-2 border-l-alert-attention " + (isSelected ? "bg-alert-attention/10" : "bg-alert-attention/5 hover:bg-alert-attention/10");
                  }

                  return (
                    <TableRow key={proposal.id} className={rowClassName}>
                      {/* CHECKBOX LINHA */}
                      <TableCell>
                        <input 
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(proposal.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isOverdue && (
                            <AlertCircle className="h-4 w-4 text-alert-overdue" />
                          )}
                          {isSoon && !isOverdue && (
                            <AlertCircle className="h-4 w-4 text-alert-soon" />
                          )}
                          {needsAlert && !isOverdue && !isSoon && (
                            <AlertCircle className="h-4 w-4 text-alert-attention" />
                          )}
                          {proposal.clientName}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(proposal.sentDate)}</TableCell>
                      <TableCell className="text-sm">{proposal.sentVia || "-"}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(proposal.value)}
                      </TableCell>
                      <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                      <TableCell>
                        <div>
                          <p className={needsAlert ? "font-medium" : ""}>
                            {formatDate(proposal.lastFollowUp)}
                          </p>
                          {needsAlert && (
                            <p className="text-xs text-alert-attention mt-1 font-medium italic">
                              Há {getDaysSinceFollowUp(proposal.lastFollowUp)} dias sem follow-up
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {proposal.expectedReturnDate ? (
                          <div>
                            <p className={isOverdue || isSoon ? "font-semibold" : ""}>
                              {formatDate(proposal.expectedReturnDate)}
                            </p>
                            {isOverdue && (
                              <p className="text-xs text-alert-overdue mt-1 font-bold">
                                ⚠ Vencido há {Math.abs(getDaysUntilReturn(proposal.expectedReturnDate)!)} dias
                              </p>
                            )}
                            {isSoon && !isOverdue && (
                              <p className="text-xs text-alert-soon mt-1 font-semibold">
                                📅 Em {getDaysUntilReturn(proposal.expectedReturnDate)} dias
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Não definida</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(proposal)}
                            className="hover:bg-primary/10 hover:text-primary"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(proposal.id)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta? Esta ação não pode ser
              desfeita.
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
