import { files } from "@/constants/files";
import { headers } from "@/constants/styles";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";

function GameTitleSection({ title, img }: { title: string; img: string }) {
  return (
    <View style={styles.gameTitleContainer}>
      <Image
        source={files.placeHolderImageGameThumbnail}
        style={{
          width: "100%",
          height: 208,
        }}
      />
      <Text style={headers.h2}>{title}</Text>
    </View>
  );
}

export default function GameTitleSections({
  items,
}: {
  items: { title: string; img: string }[];
}) {
  return (
    <FlatList
      style={{
        flex: 1,
      }}
      data={items}
      renderItem={({ item }) => (
        <GameTitleSection title={item.title} img={item.img} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  gameTitleContainer: {
    gap: 10,
  },
});
