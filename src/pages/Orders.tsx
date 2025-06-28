
import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "@/services/orderService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { BarChart3, Kanban, Plus, Search } from "lucide-react";
import NewOrderModal from "@/components/NewOrderModal";

const Orders = () => {
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [configFilter, setConfigFilter] = useState("");

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "novos":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "producao":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "aguardando":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "enviado":
        return "bg-green-100 text-green-800 border-green-200";
      case "standby":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "novos":
        return "Novos Pedidos";
      case "producao":
        return "Em Produção";
      case "aguardando":
        return "Aguardando Envio";
      case "enviado":
        return "Enviado";
      case "standby":
        return "Em Stand-by";
      default:
        return status;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.configurationType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vehicles.some(v => `${v.brand} ${v.model}`.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesConfig = !configFilter || order.configurationType.includes(configFilter);
    
    return matchesSearch && matchesStatus && matchesConfig;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Todos os Pedidos</h1>
          <div className="flex gap-3">
            <Link to="/dashboard">
              <Button variant="outline" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/kanban">
              <Button variant="outline" className="flex items-center gap-2">
                <Kanban className="h-4 w-4" />
                Kanban
              </Button>
            </Link>
            <Button 
              onClick={() => setShowNewOrderModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Pedido
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Número do pedido, configuração ou veículo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os status</SelectItem>
                    <SelectItem value="novos">Novos Pedidos</SelectItem>
                    <SelectItem value="producao">Em Produção</SelectItem>
                    <SelectItem value="aguardando">Aguardando Envio</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="standby">Em Stand-by</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="config">Configuração</Label>
                <Select value={configFilter} onValueChange={setConfigFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as configurações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as configurações</SelectItem>
                    <SelectItem value="HCV">HCV (Heavy Commercial Vehicle)</SelectItem>
                    <SelectItem value="LCV">LCV (Light Commercial Vehicle)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Pedidos */}
        <Card>
          <CardHeader>
            <CardTitle>
              Lista de Pedidos ({filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Configuração</TableHead>
                    <TableHead>Veículos</TableHead>
                    <TableHead>Rastreadores</TableHead>
                    <TableHead>Total de Itens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const totalVehicles = order.vehicles.reduce((sum, v) => sum + v.quantity, 0);
                    const totalTrackers = order.trackers.reduce((sum, t) => sum + t.quantity, 0);
                    
                    return (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {order.number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {order.configurationType}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {order.vehicles.map((vehicle, index) => (
                              <div key={index} className="text-xs">
                                <span className="font-medium">{vehicle.brand} {vehicle.model}</span>
                                <span className="text-gray-500"> ({vehicle.quantity}x)</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {order.trackers.map((tracker, index) => (
                              <div key={index} className="text-xs">
                                <span className="font-medium">{tracker.model}</span>
                                <span className="text-gray-500"> ({tracker.quantity}x)</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="text-sm font-bold text-gray-900">
                              {totalVehicles + totalTrackers}
                            </div>
                            <div className="text-xs text-gray-500">
                              {totalVehicles}V + {totalTrackers}R
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {filteredOrders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum pedido encontrado com os filtros aplicados.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <NewOrderModal
          isOpen={showNewOrderModal}
          onClose={() => setShowNewOrderModal(false)}
          onOrderCreated={() => {
            setShowNewOrderModal(false);
            refetch();
          }}
        />
      </div>
    </div>
  );
};

export default Orders;
