import dayjs from "dayjs";
import { useEffect, useState } from "react";

export function useNowTime() {
  const [time, setTime] = useState("00:00");

  //获取时间
  useEffect(() => {
    const getTime = () => {
      const time = dayjs().format("HH:mm");

      setTime(time);
    };

    getTime();

    const timer = setInterval(getTime, 60 * 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return {
    time,
  };
}
