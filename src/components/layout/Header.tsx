import { Bell, Search, User, Sun, Moon, Globe } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { CommandPalette } from "@/components/search/CommandPalette";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18n } from "@/lib/i18n";
import { DEBUG_UI } from "@/lib/debug";

export function Header() {
  const { setTheme, theme } = useTheme();
  const { signOut, user } = useAuthStore();
  const { locale, setLocale } = useI18n();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="rounded-lg p-2 hover:bg-muted" />
        <div className="relative w-96">
          <Search
            aria-hidden="true"
            focusable="false"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground"
          />
          <Input
            placeholder="Search companies, people, deals..."
            className="border-0 bg-muted/50 pl-10 focus:bg-background"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <CommandPalette />

        {/* Language selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9"
              aria-label="Select language"
            >
              <Globe className="h-4 w-4" aria-hidden="true" focusable="false" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setLocale("en")}
              className={locale === "en" ? "bg-accent" : ""}
            >
              🇺🇸 English
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLocale("da")}
              className={locale === "da" ? "bg-accent" : ""}
            >
              🇩🇰 Dansk
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Debug indicator */}
        {DEBUG_UI && (
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs border ${
            (window as any).__API_MODE__ === "LIVE" ? "text-success border-success" : "text-warning border-warning"
          }`}>
            API: {(window as any).__API_MODE__}
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9"
          aria-label="Toggle theme"
        >
          <Sun
            aria-hidden="true"
            focusable="false"
            className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
          />
          <Moon
            aria-hidden="true"
            focusable="false"
            className="h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
          />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" focusable="false" />
          <Badge className="absolute -right-1 -top-1 h-2 w-2 bg-destructive p-0" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">User</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || "user@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
