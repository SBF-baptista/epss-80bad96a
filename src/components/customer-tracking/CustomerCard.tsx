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
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {customer.address_street}, {customer.address_number} - {customer.address_neighborhood}, {customer.address_city}, {customer.address_state} - {customer.address_postal_code}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
  );
};