import { Card } from "@/components/ui/card";
import { Proposal } from "@/types/proposal";
import { FileText, CheckCircle2, XCircle, Clock } from "lucide-react";

interface DashboardProps {
  proposals: Proposal[];
}

export const Dashboard = ({ proposals }: DashboardProps) => {
  const totalProposals = proposals.length;
  const approvedProposals = proposals.filter((p) => p.status === "approved").length;
  const rejectedProposals = proposals.filter((p) => p.status === "rejected").length;
  const pendingProposals = proposals.filter((p) => p.status === "pending").length;

  const totalValue = proposals.reduce((sum, p) => sum + p.value, 0);
  const approvedValue = proposals
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.value, 0);

  const stats = [
    {
      title: "Total de Propostas",
      value: totalProposals,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Aprovadas",
      value: approvedProposals,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Recusadas",
      value: rejectedProposals,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Aguardando",
      value: pendingProposals,
      icon: Clock,
      color: "text-alert-attention",
      bgColor: "bg-alert-attention/10",
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Valor Total das Propostas
          </h3>
          <p className="text-3xl font-bold text-foreground">
            {formatCurrency(totalValue)}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Valor das Propostas Aprovadas
          </h3>
          <p className="text-3xl font-bold text-success">
            {formatCurrency(approvedValue)}
          </p>
        </Card>
      </div>
    </div>
  );
};
