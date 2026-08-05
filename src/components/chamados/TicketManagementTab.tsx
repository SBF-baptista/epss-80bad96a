import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Pencil, Plus, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TicketDashboard } from "./TicketDashboard";

export interface TicketRow {
  id: string;
  razao_social: string;
  cnpj: string;
  data_atendimento: string;
  tempo_primeiro_atendimento: string | null;
  descricao_problema: string;
  classificacao: string;
  atendente_suporte: string;
  canal_entrada: string;
  descricao_solucao: string | null;
  status: string;
  data_encerramento: string | null;
  responsavel_escalonado: string | null;
  data_escalonamento: string | null;
  produto: string;
  created_at: string;
}

interface CompanyRow {
  id: string;
  razao_social: string;
  cnpj: string;
}

export const CLASSIFICACOES = ["Baixo", "Médio", "Alta", "Crítico"];
export const ATENDENTES = ["Matheus Nunes", "Sóstenes Silva", "Pedro Nascimento", "Thalita Silva"];
export const CANAIS = ["E-mail", "Octadesk", "Tomticket", "Whatsapp"];
export const STATUSES = [
  "Em Atendimento",
  "Aguardando Retorno",
  "Concluído",
  "Fechado",
];
export const PRODUTOS = [
  "Videotelemetria",
  "Telemetria CAN",
  "Telemetria GPS",
  "Fleetup",
];

export const statusConfig: Record<string, string> = {
  "Em Atendimento": "bg-amber-100 text-amber-800 border-amber-200",
  "Aguardando Retorno": "bg-blue-100 text-blue-800 border-blue-200",
  "Concluído": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Fechado": "bg-slate-100 text-slate-800 border-slate-200",
};

export const classConfig: Record<string, string> = {
  Baixo: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Médio": "bg-yellow-100 text-yellow-800 border-yellow-200",
  Alta: "bg-red-100 text-red-800 border-red-200",
  "Crítico": "bg-neutral-900 text-white border-neutral-900",
};

export const formatDateBR = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toLocalInput = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

interface TicketForm {
  razao_social: string;
  cnpj: string;
  data_atendimento: string;
  tempo_primeiro_atendimento: string;
  descricao_problema: string;
  classificacao: string;
  atendente_suporte: string;
  canal_entrada: string;
  descricao_solucao: string;
  status: string;
  data_encerramento: string;
  responsavel_escalonado: string;
  data_escalonamento: string;
  produto: string;
}

const emptyForm: TicketForm = {
  razao_social: "",
  cnpj: "",
  data_atendimento: "",
  tempo_primeiro_atendimento: "",
  descricao_problema: "",
  classificacao: "",
  atendente_suporte: "",
  canal_entrada: "",
  descricao_solucao: "",
  status: "Em Atendimento",
  data_encerramento: "",
  responsavel_escalonado: "",
  data_escalonamento: "",
  produto: "",
};

const StepTitle = ({
  number,
  title,
  color,
}: {
  number: number;
  title: string;
  color: string;
}) => (
  <div className="flex items-center gap-2">
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white ${color}`}
    >
      {number}
    </span>
    <h3 className="text-sm font-semibold">{title}</h3>
  </div>
);

export function TicketManagementTab() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState<TicketRow | null>(null);
  const [form, setForm] = useState<TicketForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [ticketsRes, companiesRes] = await Promise.all([
      supabase
        .from("frota_tickets")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("frota_ticket_companies")
        .select("*")
        .order("razao_social"),
    ]);

    if (ticketsRes.error) {
      toast({
        title: "Erro ao carregar chamados",
        description: ticketsRes.error.message,
        variant: "destructive",
      });
    }

    setTickets((ticketsRes.data as TicketRow[]) || []);
    setCompanies((companiesRes.data as CompanyRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(
    () => ({
      total: tickets.length,
      emAtendimento: tickets.filter((t) => t.status === "Em Atendimento").length,
      aguardando: tickets.filter((t) => t.status === "Aguardando Retorno").length,
      concluidos: tickets.filter(
        (t) => t.status === "Concluído" || t.status === "Fechado"
      ).length,
    }),
    [tickets]
  );

  const filteredTickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return tickets.filter((t) => {
      const matchesSearch =
        !term ||
        t.razao_social.toLowerCase().includes(term) ||
        t.cnpj.toLowerCase().includes(term) ||
        t.descricao_problema.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "all" || t.status === statusFilter;

      let matchesDate = true;
      if (dateFrom) {
        matchesDate =
          matchesDate &&
          new Date(t.data_atendimento) >= new Date(`${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        matchesDate =
          matchesDate &&
          new Date(t.data_atendimento) <= new Date(`${dateTo}T23:59:59`);
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [tickets, searchTerm, statusFilter, dateFrom, dateTo]);

  const companySuggestions = useMemo(() => {
    const term = form.razao_social.toLowerCase();
    return companies
      .filter(
        (c) =>
          !term ||
          c.razao_social.toLowerCase().includes(term) ||
          c.cnpj.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [companies, form.razao_social]);

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (ticket: TicketRow) => {
    setForm({
      razao_social: ticket.razao_social,
      cnpj: ticket.cnpj,
      data_atendimento: toLocalInput(ticket.data_atendimento),
      tempo_primeiro_atendimento: toLocalInput(ticket.tempo_primeiro_atendimento),
      descricao_problema: ticket.descricao_problema,
      classificacao: ticket.classificacao,
      atendente_suporte: ticket.atendente_suporte,
      canal_entrada: ticket.canal_entrada,
      descricao_solucao: ticket.descricao_solucao || "",
      status: ticket.status,
      data_encerramento: toLocalInput(ticket.data_encerramento),
      responsavel_escalonado: ticket.responsavel_escalonado || "",
      data_escalonamento: toLocalInput(ticket.data_escalonamento),
      produto: ticket.produto,
    });
    setEditingId(ticket.id);
    setDialogOpen(true);
  };

  const openView = (ticket: TicketRow) => {
    setViewTicket(ticket);
    setViewDialogOpen(true);
  };

  const upsertCompany = async (notify = false) => {
    const razao = form.razao_social.trim();
    const cnpj = form.cnpj.trim();
    if (!razao || !cnpj) return;

    const existing = companies.find((c) => c.cnpj === cnpj);
    if (!existing) {
      const { data } = await supabase
        .from("frota_ticket_companies")
        .insert({ razao_social: razao, cnpj })
        .select()
        .maybeSingle();
      if (data) {
        setCompanies((prev) =>
          [...prev, data as CompanyRow].sort((a, b) =>
            a.razao_social.localeCompare(b.razao_social)
          )
        );
        if (notify) {
          toast({
            title: "Empresa cadastrada",
            description: `${razao} foi salva e ficará disponível nos próximos chamados.`,
          });
        }
      }
    } else if (existing.razao_social !== razao) {
      await supabase
        .from("frota_ticket_companies")
        .update({ razao_social: razao })
        .eq("id", existing.id);
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === existing.id ? { ...c, razao_social: razao } : c
        )
      );
    }
  };


  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await upsertCompany();

      const iso = (v: string) => (v ? new Date(v).toISOString() : null);
      const orNull = (v: string) => (v.trim() ? v.trim() : null);
      const payload = {
        razao_social: orNull(form.razao_social),
        cnpj: orNull(form.cnpj),
        data_atendimento: iso(form.data_atendimento),
        tempo_primeiro_atendimento: iso(form.tempo_primeiro_atendimento),
        descricao_problema: orNull(form.descricao_problema),
        classificacao: orNull(form.classificacao),
        atendente_suporte: orNull(form.atendente_suporte),
        canal_entrada: orNull(form.canal_entrada),
        descricao_solucao: orNull(form.descricao_solucao),
        status: form.status || "Em Atendimento",
        data_encerramento: iso(form.data_encerramento),
        responsavel_escalonado: orNull(form.responsavel_escalonado),
        data_escalonamento: iso(form.data_escalonamento),
        produto: orNull(form.produto),
      };

      if (editingId) {
        const { error } = await supabase
          .from("frota_tickets")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Chamado atualizado" });
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("frota_tickets")
          .insert({ ...payload, created_by: userData.user?.id ?? null });
        if (error) throw error;
        toast({ title: "Chamado aberto com sucesso" });
      }

      setDialogOpen(false);
      await fetchData();
    } catch (error) {
      toast({
        title: "Erro ao salvar chamado",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const statCards = [
    { label: "Total", value: stats.total, color: "text-foreground" },
    { label: "Em Atendimento", value: stats.emAtendimento, color: "text-amber-600" },
    { label: "Aguardando Retorno", value: stats.aguardando, color: "text-blue-600" },
    { label: "Concluídos/Fechados", value: stats.concluidos, color: "text-emerald-600" },
  ];

  return (
    <Tabs defaultValue="chamados" className="space-y-4">
      <TabsList>
        <TabsTrigger value="chamados">📋 Chamados</TabsTrigger>
        <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
      </TabsList>

      <TabsContent value="chamados" className="space-y-4">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {card.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Razão social, CNPJ ou problema"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1 w-full lg:w-48">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Chamado
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando chamados...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Data Atend.</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Atendente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredTickets.map((t, i) => (
                      <motion.tr
                        key={t.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b hover:bg-muted/40"
                      >
                        <TableCell className="font-medium">
                          {t.razao_social}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.cnpj}
                        </TableCell>
                        <TableCell>{formatDateBR(t.data_atendimento)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={classConfig[t.classificacao]}
                          >
                            {t.classificacao}
                          </Badge>
                        </TableCell>
                        <TableCell>{t.atendente_suporte}</TableCell>
                        <TableCell>{t.produto}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusConfig[t.status]}
                          >
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openView(t)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(t)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {filteredTickets.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-10 text-muted-foreground"
                      >
                        Nenhum chamado encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="dashboard">
        <TicketDashboard tickets={tickets} />
      </TabsContent>

      {/* Dialog criação / edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Chamado" : "Novo Chamado"}
            </DialogTitle>
            <DialogDescription>
              Preencha as etapas de abertura, resolução e encerramento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Etapa 1 */}
            <div className="space-y-3">
              <StepTitle
                number={1}
                title="Abertura / Atendimento Inicial"
                color="bg-amber-500"
              />
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1 relative">
                  <Label>Razão Social *</Label>
                  <Input
                    value={form.razao_social}
                    placeholder="Nome da empresa"
                    autoComplete="off"
                    onFocus={() => setCompanyPopoverOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => setCompanyPopoverOpen(false), 150);
                      void upsertCompany(true);
                    }}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        razao_social: e.target.value,
                      }));
                      setCompanyPopoverOpen(true);
                    }}
                  />
                  {companyPopoverOpen && companySuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Empresas cadastradas
                      </div>
                      {companySuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setForm((f) => ({
                              ...f,
                              razao_social: c.razao_social,
                              cnpj: c.cnpj,
                            }));
                            setCompanyPopoverOpen(false);
                          }}
                        >
                          <span className="block">{c.razao_social}</span>
                          <span className="block text-xs text-muted-foreground">
                            {c.cnpj}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>


                <div className="space-y-1">
                  <Label>CNPJ *</Label>
                  <Input
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj}
                    onBlur={() => void upsertCompany(true)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cnpj: e.target.value }))
                    }
                  />
                </div>


                <div className="space-y-1">
                  <Label>Data do Atendimento *</Label>
                  <Input
                    type="datetime-local"
                    value={form.data_atendimento}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, data_atendimento: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label>Tempo 1º Atendimento (SLA ≤ 1h)</Label>
                  <Input
                    type="datetime-local"
                    value={form.tempo_primeiro_atendimento}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        tempo_primeiro_atendimento: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Descrição do Problema *</Label>
                <Textarea
                  rows={3}
                  value={form.descricao_problema}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      descricao_problema: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    label: "Classificação *",
                    key: "classificacao" as const,
                    options: CLASSIFICACOES,
                  },
                  {
                    label: "Atendente Suporte *",
                    key: "atendente_suporte" as const,
                    options: ATENDENTES,
                  },
                  {
                    label: "Canal de Entrada *",
                    key: "canal_entrada" as const,
                    options: CANAIS,
                  },
                  {
                    label: "Produto *",
                    key: "produto" as const,
                    options: PRODUTOS,
                  },
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label>{field.label}</Label>
                    <Select
                      value={form[field.key]}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, [field.key]: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Etapa 2 */}
            <div className="space-y-3">
              <StepTitle
                number={2}
                title="Atendimento / Resolução"
                color="bg-blue-500"
              />
              <div className="space-y-1">
                <Label>Descrição da Solução</Label>
                <Textarea
                  rows={3}
                  value={form.descricao_solucao}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descricao_solucao: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1 md:w-1/2">
                <Label>Status *</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Etapa 3 */}
            <div className="space-y-3">
              <StepTitle number={3} title="Encerramento" color="bg-emerald-500" />
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Data Encerramento</Label>
                  <Input
                    type="datetime-local"
                    value={form.data_encerramento}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        data_encerramento: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data de Escalonamento</Label>
                  <Input
                    type="datetime-local"
                    value={form.data_escalonamento}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        data_escalonamento: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Responsável Escalonado</Label>
                  <Input
                    value={form.responsavel_escalonado}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        responsavel_escalonado: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Salvar alterações" : "Abrir chamado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Chamado</DialogTitle>
          </DialogHeader>
          {viewTicket && (
            <div className="space-y-5 text-sm">
              <section className="space-y-2">
                <h4 className="font-semibold text-amber-600">
                  1. Abertura / Atendimento Inicial
                </h4>
                <div className="grid md:grid-cols-2 gap-2">
                  <p><span className="text-muted-foreground">Razão Social:</span> {viewTicket.razao_social}</p>
                  <p><span className="text-muted-foreground">CNPJ:</span> {viewTicket.cnpj}</p>
                  <p><span className="text-muted-foreground">Data do Atendimento:</span> {formatDateBR(viewTicket.data_atendimento)}</p>
                  <p><span className="text-muted-foreground">1º Atendimento:</span> {formatDateBR(viewTicket.tempo_primeiro_atendimento)}</p>
                  <p><span className="text-muted-foreground">Classificação:</span> {viewTicket.classificacao}</p>
                  <p><span className="text-muted-foreground">Atendente:</span> {viewTicket.atendente_suporte}</p>
                  <p><span className="text-muted-foreground">Canal:</span> {viewTicket.canal_entrada}</p>
                  <p><span className="text-muted-foreground">Produto:</span> {viewTicket.produto}</p>
                </div>
                <p className="whitespace-pre-wrap">
                  <span className="text-muted-foreground">Problema:</span>{" "}
                  {viewTicket.descricao_problema}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-blue-600">
                  2. Atendimento / Resolução
                </h4>
                <p className="whitespace-pre-wrap">
                  <span className="text-muted-foreground">Solução:</span>{" "}
                  {viewTicket.descricao_solucao || "—"}
                </p>
                <p><span className="text-muted-foreground">Status:</span> {viewTicket.status}</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-semibold text-emerald-600">3. Encerramento</h4>
                <div className="grid md:grid-cols-2 gap-2">
                  <p><span className="text-muted-foreground">Data Encerramento:</span> {formatDateBR(viewTicket.data_encerramento)}</p>
                  <p><span className="text-muted-foreground">Data Escalonamento:</span> {formatDateBR(viewTicket.data_escalonamento)}</p>
                  <p><span className="text-muted-foreground">Responsável Escalonado:</span> {viewTicket.responsavel_escalonado || "—"}</p>
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

export default TicketManagementTab;
