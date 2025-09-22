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

const accessoryFormSchema = z.object({
  item_name: z.string().min(1, "Nome do acessório é obrigatório"),
  description: z.string().optional(),
});

type AccessoryFormData = z.infer<typeof accessoryFormSchema>;

export const AccessoryHomologationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AccessoryFormData>({
    resolver: zodResolver(accessoryFormSchema),
    defaultValues: {
      item_name: "",
      description: "",
    },
  });

  const onSubmit = async (data: AccessoryFormData) => {
    try {
      setIsSubmitting(true);

      // Check if accessory already exists
      const exists = await checkIfItemExists(data.item_name, 'accessory');
      if (exists) {
        toast({
          title: "Acessório já existe",
          description: "Este acessório já foi cadastrado anteriormente.",
          variant: "destructive",
        });
        return;
      }

      // Create new accessory
      await createKitItemOption({
        item_name: data.item_name,
        item_type: 'accessory',
        description: data.description,
      });

      // Refresh the accessories list
      queryClient.invalidateQueries({
        queryKey: ['kit-item-options', 'accessory']
      });

      toast({
        title: "Acessório cadastrado",
        description: "Acessório homologado cadastrado com sucesso.",
      });

      // Reset form
      form.reset();
    } catch (error) {
      console.error('Error creating accessory:', error);
      toast({
        title: "Erro ao cadastrar",
        description: "Ocorreu um erro ao cadastrar o acessório. Tente novamente.",
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
          Cadastrar Novo Acessório
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
                  <FormLabel>Nome do Acessório</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Antena GPS Externa, Cabo de Alimentação..."
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
                      placeholder="Requisitos específicos, compatibilidade, observações técnicas..."
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
                "Cadastrar Acessório"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};