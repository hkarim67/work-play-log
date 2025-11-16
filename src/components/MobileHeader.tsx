import { useState } from "react";
import { Menu, Home, Clock, Calendar, CheckCircle2, ListTodo, Target, Brain, Star } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import temwiseLogo from "@/assets/temwise-logo.png";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Home", url: "/", icon: Home },
];

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

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="md:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar">
            <SheetHeader className="border-b border-sidebar-border py-4 px-6">
              <SheetTitle className="flex items-center justify-start">
                <img src={temwiseLogo} alt="Temwise" className="h-6 w-auto object-contain" />
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-6 p-6">
              {/* Main Apps Section */}
              <div>
                <h3 className="text-sm font-medium text-white mb-3">Apps</h3>
                <nav className="flex flex-col gap-2">
                  {mainItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-white hover:bg-white/10 transition-colors"
                      activeClassName="bg-white/20 font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>

              {/* Time Tracker Section */}
              <div>
                <h3 className="text-sm font-medium text-white mb-3">Time Tracker ⏱️</h3>
                <nav className="flex flex-col gap-2">
                  {timeTrackerItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-white hover:bg-white/10 transition-colors"
                      activeClassName="bg-white/20 font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>

              {/* Flora Section */}
              <div>
                <h3 className="text-sm font-medium text-white mb-3">Flora 🌸</h3>
                <nav className="flex flex-col gap-2">
                  {floraItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-white hover:bg-white/10 transition-colors"
                      activeClassName="bg-white/20 font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>

              {/* Objectives Section */}
              <div>
                <h3 className="text-sm font-medium text-white mb-3">Objectives 🎯</h3>
                <nav className="flex flex-col gap-2">
                  {objectivesItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-white hover:bg-white/10 transition-colors"
                      activeClassName="bg-white/20 font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="flex-1 flex justify-center">
          <img src={temwiseLogo} alt="Temwise" className="h-6 w-auto object-contain" />
        </div>
      </div>
    </header>
  );
}
