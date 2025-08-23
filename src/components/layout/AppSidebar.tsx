import { useState } from "react"
import { 
  Building2, Users, Handshake, FileText, ShoppingCart, 
  Receipt, Calendar, FolderOpen, Calculator, Settings,
  ChevronLeft, Menu
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"

const navigationItems = [
  { title: "Companies", url: "/companies", icon: Building2 },
  { title: "People", url: "/people", icon: Users },
  { title: "Deals", url: "/deals", icon: Handshake },
  { title: "Quotes", url: "/quotes", icon: FileText },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Invoices", url: "/invoices", icon: Receipt },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Documents", url: "/documents", icon: FolderOpen },
  { title: "Accounting", url: "/accounting", icon: Calculator },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  const { open } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => currentPath === path || (path !== "/" && currentPath.startsWith(path))

  return (
    <Sidebar 
      className={`${!open ? "w-16" : "w-64"} border-r bg-sidebar-bg transition-all duration-300`}
      collapsible="icon"
    >
      <SidebarHeader className="p-6 border-b border-sidebar-hover">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm transform rotate-45" />
          </div>
          {open && (
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">Prism CRM</h1>
              <p className="text-xs text-sidebar-foreground/60">Professional Edition</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupLabel className={`text-sidebar-foreground/60 text-xs uppercase tracking-wider mb-4 ${!open ? 'px-2' : 'px-3'}`}>
            {open && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`
                        flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                        text-sidebar-foreground hover:bg-sidebar-hover hover:text-white
                        ${isActive(item.url) 
                          ? 'bg-sidebar-active text-white shadow-md' 
                          : ''
                        }
                        ${!open ? 'justify-center' : ''}
                      `}
                    >
                      <item.icon className={`w-4 h-4 flex-shrink-0`} />
                      {open && (
                        <span className="font-medium text-sm">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}