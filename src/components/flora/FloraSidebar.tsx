import { Home, Clock, Calendar, CheckCircle2, ListTodo, Target, ChevronLeft, ChevronRight, Sparkles, Star, Brain, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import temwiseLogo from "@/assets/temwise-logo.png";
import temwiseIcon from "@/assets/temwise-icon.png";
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

const timeTrackerItems = [
  { title: "Timer", url: "/time-tracker", icon: Clock },
  { title: "Utilization", url: "/time-tracker/utilization", icon: Target },
];

const floraItems = [
  { title: "Lists", url: "/flora", icon: ListTodo },
  { title: "Task Dump", url: "/flora/task-dump", icon: Brain },
  { title: "Calendar", url: "/flora/calendar", icon: Calendar },
  { title: "Completed", url: "/flora/completed", icon: CheckCircle2 },
];

const objectivesItems = [
  { title: "Overview", url: "/objectives", icon: Target },
  { title: "Lifetime", url: "/objectives/lifetime", icon: Star },
  { title: "Timeline", url: "/objectives/timeline", icon: Clock },
];

const mainItems = [
  { title: "Home", url: "/", icon: Home },
];

export function FloraSidebar() {
  const { open, setOpen } = useSidebar();

  return (
    <Sidebar className={open ? "w-60" : "w-14"} collapsible="icon">
      {/* Logo Section */}
      <div className="py-4 flex items-center justify-center">
        <img 
          src={open ? temwiseLogo : temwiseIcon} 
          alt="Temwise" 
          className={open ? "h-8 w-auto object-contain" : "h-8 w-8 object-contain"}
        />
      </div>
      
      <div className="border-b border-sidebar-border"></div>
      
      <SidebarContent>
        {/* Main Apps Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={!open ? "sr-only" : "text-white"}>
            Apps
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-white/10 text-white hover:text-white"
                      activeClassName="bg-white/20 text-white font-medium [&_svg]:text-white"
                    >
                      <item.icon className="h-4 w-4 text-white" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Time Tracker Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={!open ? "sr-only" : "text-white"}>
            Time Tracker ⏱️
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {timeTrackerItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-white/10 text-white hover:text-white"
                      activeClassName="bg-white/20 text-white font-medium [&_svg]:text-white"
                    >
                      <item.icon className="h-4 w-4 text-white" />
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
          <SidebarGroupLabel className={!open ? "sr-only" : "text-white"}>
            Flora 🌸
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {floraItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-white/10 text-white hover:text-white"
                      activeClassName="bg-white/20 text-white font-medium [&_svg]:text-white"
                    >
                      <item.icon className="h-4 w-4 text-white" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Objectives Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={!open ? "sr-only" : "text-white"}>
            Objectives 🎯
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {objectivesItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-white/10 text-white hover:text-white"
                      activeClassName="bg-white/20 text-white font-medium [&_svg]:text-white"
                    >
                      <item.icon className="h-4 w-4 text-white" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Logout and Collapse Buttons at Bottom */}
      <div className="mt-auto border-t border-white/20">
        <div className="p-2">
          <button
            onClick={async () => {
              const { supabase } = await import("@/integrations/supabase/client");
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-white/10 transition-colors text-white"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4 text-white" />
            {open && <span>Logout</span>}
          </button>
        </div>
        <div className="p-2">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-center p-2 rounded-md hover:bg-white/10 transition-colors text-white"
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            {open ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </Sidebar>
  );
}
