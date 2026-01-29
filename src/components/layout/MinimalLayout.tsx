import { ReactNode, useState } from "react";
import { MinimalHeader } from "./MinimalHeader";
import { TrialBanner } from "./TrialBanner";

interface MinimalLayoutProps {
  children: ReactNode;
  brandName?: string;
}

export function MinimalLayout({ children, brandName }: MinimalLayoutProps) {
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MinimalHeader
        brandName={brandName}
        isPurchaseOpen={isPurchaseOpen}
        setIsPurchaseOpen={setIsPurchaseOpen}
      />
      <TrialBanner onUpgradeClick={() => setIsPurchaseOpen(true)} />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
