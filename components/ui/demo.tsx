import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import PricingSection from "@/components/ui/pricing-section";

function InteractiveHoverButtonDemo() {
  return (
    <div className="relative justify-center">
      <InteractiveHoverButton />
    </div>
  );
}

export { InteractiveHoverButtonDemo };

function PricingSectionDemo() {
  return <PricingSection />;
}

export { PricingSectionDemo };
