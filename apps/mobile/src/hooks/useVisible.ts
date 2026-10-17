import { useRef, useState } from "react";

export default function (delay: number = 2000) {
  const timerRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);

  const show = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    !visible && setVisible(true);

    if (delay == 0) return;

    timerRef.current = setTimeout(() => {
      hide();
    }, delay);
  };

  const hide = () => {
    setVisible(false);
  };

  return {
    visible,
    show,
    hide,
  };
}
