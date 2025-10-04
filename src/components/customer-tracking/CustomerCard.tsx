import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Edit2, Phone, Mail, MapPin } from "lucide-react";
import { Customer, formatCPF, formatCNPJ, formatPhone } from "@/services/customerService";
import { KitSection } from "./KitSection";
import { CustomerEditModal } from "./CustomerEditModal";

interface CustomerKitData {
  id: string;
  kit_id: string;
  technician_id: string;
  scheduled_date: string;
  installation_time?: string;
  status: string;
  notes?: string;
  customer_name: string;
  technician_name?: string;
  kit?: any;
  homologationStatus?: any;
}

interface CustomerCardProps {
  customer: Customer;
  customerKits: CustomerKitData[];
  onUpdate: () => void;
}

export const CustomerCard = ({ customer, customerKits, onUpdate }: CustomerCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const formatDocument = (documentNumber: string, documentType: string) => {
    if (documentType === 'CPF') {
      return formatCPF(documentNumber);
    } else if (documentType === 'CNPJ') {
      return formatCNPJ(documentNumber);
    }
    return documentNumber;
  };

  const getKitStatusBadge = () => {
    if (customerKits.length === 0) {
      return <Badge variant="outline">Sem kits</Badge>;
    }

    const statuses = customerKits.map(kit => kit.status);
    const hasShipped = statuses.includes('shipped');
    const hasCompleted = statuses.includes('completed');
    const hasInProgress = statuses.includes('in_progress');
    const hasScheduled = statuses.includes('scheduled');

    if (hasShipped && customerKits.length === statuses.filter(s => s === 'shipped').length) {
      return <Badge className="bg-green-500 hover:bg-green-600">✅ Todos enviados</Badge>;
    } else if (hasCompleted) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">📦 Aguardando envio</Badge>;
    } else if (hasInProgress) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">🔧 Em produção</Badge>;
    } else if (hasScheduled) {
      return <Badge className="bg-blue-500 hover:bg-blue-600">📋 Pedidos</Badge>;
    }

    return <Badge variant="outline">Status indefinido</Badge>;
  };

  return (
    <>
      <Card className="w-full">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                    {getKitStatusBadge()}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-mono">
                      {formatDocument(customer.document_number, customer.document_type)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {formatPhone(customer.phone)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {customer.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="h-4 w-4" />
                    {customer.address_street}, {customer.address_number} - {customer.address_neighborhood}
                    <br />
                    {customer.address_city}, {customer.address_state} - {customer.address_postal_code}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditModalOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 border-b pb-2">
                  Kits Vinculados ({customerKits.length})
                </h4>
                
                {customerKits.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Nenhum kit vinculado a este cliente.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {customerKits.map((kitData) => (
                      <KitSection
                        key={kitData.id}
                        kitData={kitData}
                        onUpdate={onUpdate}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <CustomerEditModal
        customer={customer}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={onUpdate}
      />
    </>
  );
};