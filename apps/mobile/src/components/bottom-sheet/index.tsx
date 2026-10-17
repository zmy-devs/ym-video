import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  PropsWithChildren,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { BackHandler } from "react-native";

export type BottomSheetHandle = {
  open: () => void;
  close: () => void;
};

type Props = {
  snapPoints?: (string | number)[];
};

export default forwardRef<BottomSheetHandle, PropsWithChildren<Props>>(
  ({ children, snapPoints }, ref) => {
    const isOpen = useRef(false);

    const bottomSheetRef = useRef<BottomSheetModal>(null);

    useEffect(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (isOpen.current) {
            bottomSheetRef.current?.close();
            return true;
          }

          return false;
        }
      );

      return () => subscription.remove();
    }, []);

    useImperativeHandle(ref, () => ({
      open: () => {
        bottomSheetRef.current?.present();
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
    }));

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={!snapPoints}
        enableContentPanningGesture={false}
        enablePanDownToClose={true}
        backdropComponent={props => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.5}
          />
        )}
        backgroundStyle={{
          backgroundColor: "#202020",
        }}
        handleIndicatorStyle={{
          width: 40,
          backgroundColor: "#44403c",
        }}
        onChange={index => (isOpen.current = index != -1)}
      >
        {children}
      </BottomSheetModal>
    );
  }
);
