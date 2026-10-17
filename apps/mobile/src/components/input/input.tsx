import {
  forwardRef,
  ReactNode,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import Icon, { IconName } from "../icon";

type Props = {
  disable?: boolean;
  placeholder?: string;
  className?: string;

  beforeIcon?: IconName | ReactNode;

  submitToClear?: boolean;

  onSubmit?: (keyword: string) => void;
  onChange?: (keyword: string) => void;
};

export type InputHandle = {
  focus: () => void;
};

export default forwardRef<InputHandle, Props>(
  (
    {
      disable,
      placeholder,
      className,
      beforeIcon,
      submitToClear = true,
      onChange,
      onSubmit,
    },
    ref
  ) => {
    const [keyword, setKeyword] = useState("");

    const inputRef = useRef<TextInput>(null);

    const clear = () => {
      handleChange("");
    };

    //处理提交
    const handleSubmit = () => {
      if (keyword.trim().length == 0) {
        return;
      }

      onSubmit && onSubmit(keyword);

      if (submitToClear) {
        clear();
      }
    };

    //处理文字变化
    const handleChange = (value: string) => {
      setKeyword(value);

      onChange && onChange(value);
    };

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    return (
      <View
        className={`${className} h-12 px-2 flex-row items-center rounded-xl bg-222 ${disable && "pointer-events-none"}`}
      >
        {beforeIcon && (
          <View className="w-10 h-10 flex-center">
            {typeof beforeIcon == "string" ? (
              <Icon
                name={beforeIcon as IconName}
                size={26}
                color="rgba(255,255,255,0.3)"
              />
            ) : (
              beforeIcon
            )}
          </View>
        )}

        <TextInput
          ref={inputRef}
          placeholder={placeholder}
          className="flex-1 text-main"
          placeholderTextColor="rgba(255,255,255,0.3)"
          cursorColor="rgba(255,255,255,0.8)"
          value={keyword}
          onChangeText={handleChange}
          onSubmitEditing={handleSubmit}
        />

        {keyword.length > 0 && (
          <TouchableOpacity className="w-10 h-10 flex-center" onPress={clear}>
            <Icon name="close" size={24} color="rgba(255,255,255,0.2)" />
          </TouchableOpacity>
        )}
      </View>
    );
  }
);
