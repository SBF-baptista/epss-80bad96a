import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { createKitItemOption, checkIfItemExists } from "@/services/kitItemOptionsService";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";

const cameraFormSchema = z.object({
  item_name: z.string().min(1, "Nome do câmera é obrigatório"),
  description: z.string().optional(),
  requires_homologation: z.boolean(),
});

type CameraFormData = z.infer<typeof cameraFormSchema>;

interface CameraHomologationFormProps {
  onSuccess?: () => void;
}

export const CameraHomologationForm = ({ onSuccess }: CameraHomologationFormProps = {}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CameraFormData>({
    resolver: zodResolver(cameraFormSchema),
    defaultValues: {
      item_name: "",
      description: "",
      requires_homologation: true,
    },
  });

  const onSubmit = async (data: CameraFormData) => {
    try {
      setIsSubmitting(true);

      const exists = await checkIfItemExists(data.item_name, 'camera');
      if (exists) {
        toast({
          title: "Câmera já existe",
          description: "Este câmera já foi cadastrado anteriormente.",
          variant: "destructive",
        });
        return;
      }

      await createKitItemOption({
        item_name: data.item_name,
        item_type: 'camera',
        description: data.description,
        requires_homologation: data.requires_homologation,
      });

      queryClient.invalidateQueries({ queryKey: ['kit-item-options', 'camera'] });
      queryClient.invalidateQueries({ queryKey: ['kit-item-options'] });
      queryClient.invalidateQueries({ queryKey: ['pending-homologation-items'] });

      toast({
        title: "Câmera cadastrado",
        description: "Câmera homologado cadastrado com sucesso.",
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating camera:', error);
      toast({
        title: "Erro ao cadastrar",
        description: "Ocorreu um erro ao cadastrar o câmera. Tente novamente.",
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
          Cadastrar Novo Câmera
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
                  <FormLabel>Nome do Câmera</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: FMC130, FMC150, Ruptela FM-Eco4..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requires_homologation"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-md border p-4">
                  <div className="space-y-1">
                    <FormLabel>Precisa de homologação</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Desative para permitir que veículos com este câmera sigam direto ao Planejamento.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
                      placeholder="Especificações, compatibilidade, observações técnicas..."
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
                "Cadastrar Câmera"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
