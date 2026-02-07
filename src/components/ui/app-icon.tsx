import React from "react";
import * as Lucide from "lucide-react";
import { Icon } from "./icon";

// Try to optionally require Hugeicons if available at runtime/build time.
let Huge: Record<string, any> | null = null;
try {
  // Use require so the bundler only includes Hugeicons if it's installed.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Huge = require("hugeicons-react");
} catch (e) {
  Huge = null;
}

type LucideKeys = keyof typeof Lucide;

interface AppIconProps extends React.SVGProps<SVGSVGElement> {
  name: LucideKeys | string;
  size?: number | string;
}

export function AppIcon({
  name,
  size = 20,
  className = "",
  ...rest
}: AppIconProps) {
  // Prefer Hugeicons component if available, otherwise fallback to lucide-react
  const HugeComp = Huge ? (Huge as any)[name] : null;
  if (HugeComp) {
    return (
      <HugeComp
        size={typeof size === "number" ? size : undefined}
        className={className}
        {...rest}
      />
    );
  }

  const Comp = (Lucide as any)[name];
  if (Comp) {
    return (
      <Comp
        size={typeof size === "number" ? size : undefined}
        className={className}
        {...rest}
      />
    );
  }

  return (
    <Icon size={size} className={className} {...rest}>
      <circle cx="12" cy="12" r="8" fill="currentColor" />
    </Icon>
  );
}

export default AppIcon;
