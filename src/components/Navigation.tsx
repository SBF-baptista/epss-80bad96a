
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, Kanban, Settings, CheckSquare } from "lucide-react";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Dashboard", icon: BarChart3 },
    { to: "/kanban", label: "Kanban", icon: Kanban },
    { to: "/homologation", label: "Homologação", icon: CheckSquare },
    { to: "/orders", label: "Pedidos", icon: Settings },
    { to: "/config", label: "Configurações", icon: Settings },
  ];

  return (
    <nav className="flex gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.to;
        
        return (
          <Button
            key={item.to}
            asChild
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className="flex items-center gap-2"
          >
            <Link to={item.to}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
};

export default Navigation;
