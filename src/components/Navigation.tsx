import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { to: "/homologation", label: "Homologação" },
    { to: "/kits", label: "Kits" },
    { to: "/customer-tracking", label: "Acompanhamento de Clientes" },
    { to: "/accessories-supplies", label: "Acessórios & Insumos" },
    { to: "/technicians", label: "Técnicos" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/kanban", label: "Kanban" },
    { to: "/orders", label: "Pedidos" },
    { to: "/config", label: "Configurações" },
  ];

  return (
    <nav className="flex gap-2 flex-wrap">
      {navItems.map((item) => {
        const isActive = location.pathname === item.to;
        
        return (
          <Button
            key={item.to}
            asChild
            variant={isActive ? "default" : "ghost"}
            size="sm"
          >
            <Link to={item.to}>
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
};

export default Navigation;
