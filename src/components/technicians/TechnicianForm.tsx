import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createTechnician, updateTechnician, type Technician } from "@/services/technicianService";
import { fetchAddressByCEP, formatCEP, isValidCEP } from "@/services/cepService";
import { Loader2 } from "lucide-react";

const technicianSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  postal_code: z.string().trim().min(1, "CEP é obrigatório"),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
});

type TechnicianFormData = z.infer<typeof technicianSchema>;

interface TechnicianFormProps {
  technician?: Technician | null;
  onSuccess?: (technician: Technician) => void;
  onCancel?: () => void;
}

export const TechnicianForm = ({ technician, onSuccess, onCancel }: TechnicianFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCEP, setIsFetchingCEP] = useState(false);

  const form = useForm<TechnicianFormData>({
    resolver: zodResolver(technicianSchema),
    defaultValues: {
      name: technician?.name || "",
      postal_code: technician?.postal_code || "",
      address_street: technician?.address_street || "",
      address_number: technician?.address_number || "",
      address_neighborhood: technician?.address_neighborhood || "",
      address_city: technician?.address_city || "",
      address_state: technician?.address_state || "",
    },
  });

  const handleCEPChange = async (cep: string) => {
    const formattedCEP = formatCEP(cep);
    form.setValue("postal_code", formattedCEP);

    if (isValidCEP(cep)) {
      setIsFetchingCEP(true);
      try {
        const addressData = await fetchAddressByCEP(cep);
        if (addressData) {
          form.setValue("address_street", addressData.logradouro || "");
          form.setValue("address_neighborhood", addressData.bairro || "");
          form.setValue("address_city", addressData.localidade || "");
          form.setValue("address_state", addressData.uf || "");
        }
      } catch (error) {
        toast({
          title: "Erro ao buscar CEP",
          description: error instanceof Error ? error.message : "CEP não encontrado",
          variant: "destructive",
        });
      } finally {
        setIsFetchingCEP(false);
      }
    }
  };

  const onSubmit = async (data: TechnicianFormData) => {
    setIsLoading(true);
    try {
      const technicianData = {
        name: data.name,
        postal_code: data.postal_code,
        address_street: data.address_street,
        address_number: data.address_number,
        address_neighborhood: data.address_neighborhood,
        address_city: data.address_city,
        address_state: data.address_state,
      };

      const result = technician 
        ? await updateTechnician(technician.id!, technicianData)
        : await createTechnician(technicianData);

      toast({
        title: "Sucesso",
        description: technician ? "Técnico atualizado com sucesso" : "Técnico cadastrado com sucesso",
      });

      onSuccess?.(result);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar técnico",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {technician ? "Editar Técnico" : "Cadastrar Técnico"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="name">Nome do Técnico *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Digite o nome completo"
                className={form.formState.errors.name ? "border-destructive" : ""}
              />
              {form.formState.errors.name && (
                <span className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </span>
              )}
            </div>

            <div>
              <Label htmlFor="postal_code">CEP *</Label>
              <div className="relative">
                <Input
                  id="postal_code"
                  {...form.register("postal_code")}
                  onChange={(e) => handleCEPChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  className={form.formState.errors.postal_code ? "border-destructive" : ""}
                />
                {isFetchingCEP && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
              {form.formState.errors.postal_code && (
                <span className="text-sm text-destructive">
                  {form.formState.errors.postal_code.message}
                </span>
              )}
            </div>

            <div>
              <Label htmlFor="address_number">Número</Label>
              <Input
                id="address_number"
                {...form.register("address_number")}
                placeholder="123"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address_street">Logradouro</Label>
              <Input
                id="address_street"
                {...form.register("address_street")}
                placeholder="Rua, Avenida, etc."
              />
            </div>

            <div>
              <Label htmlFor="address_neighborhood">Bairro</Label>
              <Input
                id="address_neighborhood"
                {...form.register("address_neighborhood")}
                placeholder="Nome do bairro"
              />
            </div>

            <div>
              <Label htmlFor="address_city">Cidade</Label>
              <Input
                id="address_city"
                {...form.register("address_city")}
                placeholder="Nome da cidade"
              />
            </div>

            <div>
              <Label htmlFor="address_state">Estado</Label>
              <Input
                id="address_state"
                {...form.register("address_state")}
                placeholder="UF"
                maxLength={2}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              type="submit"
              disabled={isLoading || isFetchingCEP}
              className="flex-1 sm:flex-initial"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 sm:flex-initial"
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};