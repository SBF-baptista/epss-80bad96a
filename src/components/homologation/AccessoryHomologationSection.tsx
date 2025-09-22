import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessoryHomologationForm } from "./AccessoryHomologationForm";
import { AccessoryHomologationList } from "./AccessoryHomologationList";

export const AccessoryHomologationSection = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">
          Homologação de Acessórios
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Cadastre e gerencie acessórios homologados que estarão disponíveis para composição de kits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AccessoryHomologationForm />
        <AccessoryHomologationList />
      </CardContent>
    </Card>
  );
};