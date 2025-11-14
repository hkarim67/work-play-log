import { Home, Clock, Calendar, CheckCircle2, ListTodo } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const floraItems = [
  { title: "Lists", url: "/flora", icon: ListTodo },
  { title: "Calendar", url: "/flora/calendar", icon: Calendar },
  { title: "Completed", url: "/flora/completed", icon: CheckCircle2 },
];

const mainItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Time Tracker", url: "/time-tracker", icon: Clock },
];

export function FloraSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar className={open ? "w-60" : "w-14"} collapsible="icon">
      <SidebarContent>
        {/* Main Apps Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={!open ? "sr-only" : ""}>
            Apps
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Flora Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={!open ? "sr-only" : ""}>
            Flora 🌸
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {floraItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-flora-sage/10"
                      activeClassName="bg-flora-sage/20 text-flora-sage font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
