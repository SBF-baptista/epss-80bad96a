import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Customer, updateCustomer, CreateCustomerData } from "@/services/customerService";

interface CustomerEditModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const CustomerEditModal = ({ customer, isOpen, onClose, onUpdate }: CustomerEditModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCustomerData>({
    name: "",
    document_number: "",
    document_type: "cpf",
    phone: "",
    email: "",
    address_street: "",
    address_number: "",
    address_neighborhood: "",
    address_city: "",
    address_state: "",
    address_postal_code: "",
    address_complement: ""
  });

  useEffect(() => {
    if (customer && isOpen) {
      setFormData({
        name: customer.name,
        document_number: customer.document_number,
        document_type: customer.document_type,
        phone: customer.phone,
        email: customer.email,
        address_street: customer.address_street,
        address_number: customer.address_number,
        address_neighborhood: customer.address_neighborhood,
        address_city: customer.address_city,
        address_state: customer.address_state,
        address_postal_code: customer.address_postal_code,
        address_complement: customer.address_complement || ""
      });
    }
  }, [customer, isOpen]);

  const handleSubmit = async (data: CreateCustomerData) => {
    try {
      setIsLoading(true);
      await updateCustomer(customer.id!, data);
      
      toast({
        title: "Sucesso",
        description: "Cliente atualizado com sucesso!"
      });
      
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar cliente",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(formData);
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Rua</label>
              <input
                type="text"
                value={formData.address_street}
                onChange={(e) => setFormData(prev => ({...prev, address_street: e.target.value}))}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Número</label>
              <input
                type="text"
                value={formData.address_number}
                onChange={(e) => setFormData(prev => ({...prev, address_number: e.target.value}))}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Cidade</label>
              <input
                type="text"
                value={formData.address_city}
                onChange={(e) => setFormData(prev => ({...prev, address_city: e.target.value}))}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <input
                type="text"
                value={formData.address_state}
                onChange={(e) => setFormData(prev => ({...prev, address_state: e.target.value}))}
                className="w-full p-2 border rounded-md"
                maxLength={2}
                required
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Atualizando..." : "Atualizar Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};