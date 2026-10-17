import { forwardRef, useImperativeHandle, useRef } from "react";
import { TextInput } from "react-native";
import Input from "./input/input";

type Props = {
  disable?: boolean;
  placeholder?: string;
  onSubmit?: (keyword: string) => void;
  onChange?: (keyword: string) => void;
};

export type SearchBarHandle = {
  focus: () => void;
};

export default forwardRef<SearchBarHandle, Props>(
  ({ disable, placeholder = "搜索影视资源...", onSubmit, onChange }, ref) => {
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    return (
      <Input
        className="flex-1"
        ref={inputRef}
        placeholder={placeholder}
        disable={disable}
        beforeIcon="search"
        onChange={onChange}
        onSubmit={onSubmit}
      />
    );
  }
);
