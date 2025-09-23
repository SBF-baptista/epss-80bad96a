import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createKitItemOption, checkIfItemExists } from "@/services/kitItemOptionsService";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";

const supplyFormSchema = z.object({
  item_name: z.string().min(1, "Nome do insumo é obrigatório"),
  description: z.string().optional(),
});

type SupplyFormData = z.infer<typeof supplyFormSchema>;

export const SupplyHomologationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SupplyFormData>({
    resolver: zodResolver(supplyFormSchema),
    defaultValues: {
      item_name: "",
      description: "",
    },
  });

  const onSubmit = async (data: SupplyFormData) => {
    try {
      setIsSubmitting(true);

      // Check if supply already exists
      const exists = await checkIfItemExists(data.item_name, 'supply');
      if (exists) {
        toast({
          title: "Insumo já existe",
          description: "Este insumo já foi cadastrado anteriormente.",
          variant: "destructive",
        });
        return;
      }

      // Create new supply
      await createKitItemOption({
        item_name: data.item_name,
        item_type: 'supply',
        description: data.description,
      });

      // Refresh the supplies list
      queryClient.invalidateQueries({
        queryKey: ['kit-item-options', 'supply']
      });

      toast({
        title: "Insumo cadastrado",
        description: "Insumo homologado cadastrado com sucesso.",
      });

      // Reset form
      form.reset();
    } catch (error) {
      console.error('Error creating supply:', error);
      toast({
        title: "Erro ao cadastrar",
        description: "Ocorreu um erro ao cadastrar o insumo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Cadastrar Novo Insumo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="item_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Insumo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Parafusos M6, Abraçadeiras, Fita Isolante..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Técnicas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Especificações técnicas, medidas, materiais, observações..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Cadastrar Insumo"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};