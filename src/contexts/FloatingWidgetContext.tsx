import { createContext, useContext, useState, type ReactNode } from "react";

export type FloatingWidgetName = "chat" | "labref";

interface FloatingWidgetContextValue {
  /** Widget nổi (góc dưới phải) nào đang mở - chỉ 1 cái được mở cùng lúc để tránh đè lên nhau. */
  activeWidget: FloatingWidgetName | null;
  setActiveWidget: (widget: FloatingWidgetName | null) => void;
}

const FloatingWidgetContext = createContext<FloatingWidgetContextValue | undefined>(undefined);

export function FloatingWidgetProvider({ children }: { children: ReactNode }) {
  const [activeWidget, setActiveWidget] = useState<FloatingWidgetName | null>(null);
  return (
    <FloatingWidgetContext.Provider value={{ activeWidget, setActiveWidget }}>
      {children}
    </FloatingWidgetContext.Provider>
  );
}

export function useFloatingWidget() {
  const ctx = useContext(FloatingWidgetContext);
  if (!ctx) throw new Error("useFloatingWidget must be used within FloatingWidgetProvider");
  return ctx;
}
