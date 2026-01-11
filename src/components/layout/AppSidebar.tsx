import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/hooks/useBrand";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Target,
  Palette,
  Users,
  MessageSquare,
  LogOut,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";

const menuItems = [
  {
    title: "Painel",
    url: "/dashboard",
    icon: LayoutDashboard,
    color: "text-foreground",
  },
  {
    title: "Identidade da Marca",
    url: "/brand-identity",
    icon: Target,
    color: "text-brand-identity",
  },
  {
    title: "Identidade Visual",
    url: "/visual-identity",
    icon: Palette,
    color: "text-visual-identity",
  },
  {
    title: "Público-Alvo",
    url: "/target-audience",
    icon: Users,
    color: "text-target-audience",
  },
  {
    title: "Tom de Voz",
    url: "/tone-voice",
    icon: MessageSquare,
    color: "text-tone-voice",
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { brand } = useBrand();

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">Brand Central</span>
            {brand && (
              <span className="text-xs text-muted-foreground truncate max-w-32">
                {brand.name}
              </span>
            )}
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-12 px-3 rounded-xl transition-all duration-200"
                    >
                      <Link to={item.url}>
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate max-w-24">
              {user?.email}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
