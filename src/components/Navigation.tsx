import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { getNavigationItems } from "@/services/permissionsService";

const Navigation = () => {
  const location = useLocation();
  const { role, permissions } = useUserRole();

  const navItems = getNavigationItems(role, permissions);

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
