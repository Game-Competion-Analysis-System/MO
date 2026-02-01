import GameTitleSections from "@/components/GameTitleSelections";
import { container, headers } from "@/constants/styles";
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={container.padding}>
      <Text style={headers.h1}>Pick a game to analyze</Text>
      <GameTitleSections
        items={[
          {
            title: "Game 1",
            img: "@/assets/images/placeholder-image-thumb.png",
          },
          {
            title: "Game 2",
            img: "@/assets/images/placeholder-image-thumb.png",
          },
          {
            title: "Game 3",
            img: "@/assets/images/placeholder-image-thumb.png",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({});
