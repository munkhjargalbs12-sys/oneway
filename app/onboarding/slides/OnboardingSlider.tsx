import { useRef, useState } from "react";
import { FlatList, View, useWindowDimensions } from "react-native";

import Slide1 from "./slide1";
import Slide2 from "./slide2";
import Slide3 from "./slide3";
import Slide4 from "./slide4";

const slides = [
  { id: "1", Component: Slide1 },
  { id: "2", Component: Slide2 },
  { id: "3", Component: Slide3 },
  { id: "4", Component: Slide4 },
];

export default function OnboardingSlider() {
  const { width } = useWindowDimensions();
  const flatRef = useRef<FlatList<any>>(null);
  const [index, setIndex] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index: itemIndex }) => {
          const Slide = item.Component;

          return (
            <View style={{ width, height: "100%" }}>
              {/* 🔥 ACTIVE PROP ДАМЖУУЛЖ БАЙНА */}
              <Slide active={index === itemIndex} />
            </View>
          );
        }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(
            e.nativeEvent.contentOffset.x / width
          );
          setIndex(i);
        }}
      />
    </View>
  );
}
