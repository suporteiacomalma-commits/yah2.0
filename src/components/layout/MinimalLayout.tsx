import { ReactNode } from "react";
import { MinimalHeader } from "./MinimalHeader";

interface MinimalLayoutProps {
  children: ReactNode;
  brandName?: string;
}

export function MinimalLayout({ children, brandName }: MinimalLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MinimalHeader brandName={brandName} />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
