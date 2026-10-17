import { TouchableOpacity, View, Text } from "react-native";
import Icon, { IconName } from "./icon";
import { isValidElement, ReactNode } from "react";

interface RenderItem<T> {
  item: T;
  index: number;
}

type GroupProps<T> = {
  data: T[];
  itemKey?: (item: T) => string | number;
  renderItem?: (props: RenderItem<T>) => ReactNode;
};

export function Group<T>({ data, renderItem, itemKey }: GroupProps<T>) {
  return (
    <View className="rounded-xl bg-222">
      {data.map((item, index) => (
        <View
          key={itemKey ? itemKey(item) : index}
          className={`w-full h-14 border-333 ${index != data.length - 1 && "border-b"}`}
        >
          {isValidElement(item)
            ? item
            : renderItem &&
              renderItem({
                item,
                index,
              })}
        </View>
      ))}
    </View>
  );
}

type ItemProps = {
  label: string;
  sub?: string | ReactNode;
  icon?: IconName;

  rightVisible?: boolean;

  labelClassName?: string;

  onPress?: () => void;
  onLongPress?: () => void;
};

export function GroupItem({
  label,
  sub,
  icon,
  rightVisible,
  labelClassName,
  onPress,
  onLongPress,
}: ItemProps) {
  return (
    <TouchableOpacity
      className="flex-1 px-4 flex-row items-center gap-2"
      onPress={() => onPress && onPress()}
      onLongPress={onLongPress}
      delayLongPress={200}
    >
      {icon && <Icon name={icon} size={22} />}

      <Text className={`${labelClassName} mr-auto text-main text-lg`}>
        {label}
      </Text>

      {typeof sub == "string" ? <Text className="text-sub">{sub}</Text> : sub}

      {rightVisible && (
        <Icon name="back" color="#888" className="rotate-180" size={18} />
      )}
    </TouchableOpacity>
  );
}
