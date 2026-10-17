import { IconName } from "../icon";

type GetOption<T> = T | ((data?: any) => T);

export type MenuProps = {
  data: MenuGroup[];
  width?: number;
  customData?: any;
};

export type MenuGroup = {
  label?: string;
  hidden?: boolean;
  children: GetOption<MenuItem[]>;
};

export type MenuItem = {
  label?: string;
  value?: string | number | symbol;
  icon?: IconName;
  sub?: GetOption<string>;
  hoverColor?: string;
  active?: GetOption<boolean>;
  hidden?: GetOption<boolean>;
  disable?: GetOption<boolean>;
  onSelect?: (data?: any) => void;
};
