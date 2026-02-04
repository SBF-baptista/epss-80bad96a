import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { Customer } from "@/services/customerService";
import { KitSection } from "./KitSection";

import { CustomerKitData } from "@/pages/CustomerTracking";

interface CustomerCardProps {
  customer: Customer;
  customerKits: CustomerKitData[];
  onUpdate: () => void;
}

export const CustomerCard = ({ customer, customerKits, onUpdate }: CustomerCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="w-full rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl p-4 sm:p-5">
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base sm:text-lg font-semibold text-foreground truncate">
                    {customer.name}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
                  <span className="truncate text-foreground/60 text-xs sm:text-sm">
                    {customer.address_street}, {customer.address_number} - {customer.address_neighborhood}, {customer.address_city}, {customer.address_state} - {customer.address_postal_code}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center 
                  transition-all duration-200
                  ${isOpen 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }
                `}>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 sm:px-5 pb-4 sm:pb-5">
            <div className="space-y-4">
              <h4 className="font-medium text-foreground/80 text-sm border-b border-border/50 pb-2">
                Veículos ({customerKits.length})
              </h4>
              
              {customerKits.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">
                  Nenhum kit vinculado a este cliente.
                </p>
              ) : (
                <div className="space-y-3">
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
  );
};
