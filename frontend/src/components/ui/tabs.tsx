import * as React from "react";
import { cn } from "./button";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

/** M3 primary tabs: a row on a divider, the active tab gets a 3px indicator. */
export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tablist"
      className={cn("flex items-end overflow-x-auto border-b border-outline-variant", className)}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
  badge,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isSelected = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "state-layer relative inline-flex h-12 items-center justify-center gap-1.5 whitespace-nowrap px-4 text-title-sm select-none transition-colors",
        isSelected ? "text-primary" : "text-on-surface-variant hover:text-on-surface",
        className
      )}
    >
      {children}
      {badge}
      {isSelected && (
        <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-t-full bg-primary" aria-hidden="true" />
      )}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.value !== value) return null;

  return (
    <div role="tabpanel" className={cn("animate-in focus-visible:outline-none", className)}>
      {children}
    </div>
  );
}
