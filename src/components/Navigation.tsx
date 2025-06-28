
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, Kanban, List, Plus } from "lucide-react";
import { useState } from "react";
import NewOrderModal from "./NewOrderModal";

const Navigation = () => {
  const location = useLocation();
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  const navItems = [
    {
      href: "/kanban",
      label: "Kanban",
      icon: Kanban,
      description: "Gestão visual de pedidos"
    },
    {
      href: "/orders",
      label: "Tabela",
      icon: List,
      description: "Lista completa de pedidos"
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: BarChart3,
      description: "Análises e relatórios"
    }
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      <div className="flex items-center gap-3">
        {navItems.map((item) => (
          <Link key={item.href} to={item.href}>
            <Button 
              variant={isActive(item.href) ? "default" : "outline"}
              className="flex items-center gap-2"
              title={item.description}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        ))}
        
        <Button 
          onClick={() => setShowNewOrderModal(true)}
          className="flex items-center gap-2 ml-2"
        >
          <Plus className="h-4 w-4" />
          Novo Pedido
        </Button>
      </div>

      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onOrderCreated={() => {
          setShowNewOrderModal(false);
          // Trigger a page refresh to show new data
          window.location.reload();
        }}
      />
    </>
  );
};

export default Navigation;
