import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type FloatingWidgetName = "chat" | "labref";

const MOBILE_BREAKPOINT = 768;
const SWIPE_MIN_DISTANCE = 50;

interface FloatingWidgetContextValue {
  /** Widget nổi (góc dưới phải) nào đang mở - chỉ 1 cái được mở cùng lúc để tránh đè lên nhau. */
  activeWidget: FloatingWidgetName | null;
  setActiveWidget: (widget: FloatingWidgetName | null) => void;
  /** Trên điện thoại, các nút tiện ích nổi (nhạc, cận lâm sàng, AI) chỉ hiện
   *  khi người dùng vuốt ngang - để dành diện tích màn hình cho việc học. Trên
   *  máy tính luôn hiện sẵn. */
  dockVisible: boolean;
}

const FloatingWidgetContext = createContext<FloatingWidgetContextValue | undefined>(undefined);

export function FloatingWidgetProvider({ children }: { children: ReactNode }) {
  const [activeWidget, setActiveWidget] = useState<FloatingWidgetName | null>(null);
  const [dockVisible, setDockVisible] = useState(() => window.innerWidth >= MOBILE_BREAKPOINT);

  useEffect(() => {
    if (window.innerWidth >= MOBILE_BREAKPOINT) return;
    let startX = 0;
    let startY = 0;
    function handleTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
    function handleTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > SWIPE_MIN_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
        setDockVisible((v) => !v);
      }
    }
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <FloatingWidgetContext.Provider value={{ activeWidget, setActiveWidget, dockVisible }}>
      {children}
    </FloatingWidgetContext.Provider>
  );
}

export function useFloatingWidget() {
  const ctx = useContext(FloatingWidgetContext);
  if (!ctx) throw new Error("useFloatingWidget must be used within FloatingWidgetProvider");
  return ctx;
}
