"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, BarChart2, Clock, Database, FileText, Home, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { LiveClock } from "@/components/live-clock"

export function Sidebar() {
  const pathname = usePathname()

  const routes = [
    {
      label: "Dashboard",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      label: "Logs",
      icon: FileText,
      href: "/",
      active: pathname === "/",
    },
    {
      label: "Analytics",
      icon: BarChart2,
      href: "/analytics",
      active: pathname === "/analytics",
    },
    {
      label: "Services",
      icon: Database,
      href: "/services",
      active: pathname === "/services",
    },
    {
      label: "Activity",
      icon: Activity,
      href: "/activity",
      active: pathname === "/activity",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
      active: pathname === "/settings",
    },
  ]

  return (
    <div className="group fixed inset-y-0 left-0 z-30 flex h-full w-[220px] flex-col border-r bg-background transition-all">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <FileText className="h-5 w-5 text-primary" />
          <span>Log Viewer</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {routes.map((route) => (
            <Button
              key={route.href}
              variant={route.active ? "secondary" : "ghost"}
              className={cn("w-full justify-start", route.active && "bg-secondary")}
              asChild
            >
              <Link href={route.href}>
                <route.icon className="mr-2 h-4 w-4" />
                {route.label}
              </Link>
            </Button>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="space-y-4">
          <div className="px-4 py-2">
            <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Services Status</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs">API Server</span>
                <span className="flex h-2 w-2 rounded-full bg-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Web Server</span>
                <span className="flex h-2 w-2 rounded-full bg-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Database</span>
                <span className="flex h-2 w-2 rounded-full bg-yellow-500" />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <LiveClock />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
