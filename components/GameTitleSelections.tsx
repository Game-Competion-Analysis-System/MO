import { files } from "@/constants/files";
import { headers } from "@/constants/styles";
import { useRouter } from "expo-router";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

function GameTitleSection({
  title,
  img,
  onPress,
}: {
  title: string;
  img: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
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
    </Pressable>
  );
}

export default function GameTitleSections({
  items,
}: {
  items: { title: string; img: string }[];
}) {
  const router = useRouter();

  return (
    <FlatList
      style={{
        flex: 1,
      }}
      contentContainerStyle={{
        gap: 16,
      }}
      data={items}
      renderItem={({ item, index }) => (
        <GameTitleSection
          title={item.title}
          img={item.img}
          onPress={() => router.push(`/game/${String(index + 1)}` as any)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  gameTitleContainer: {
    gap: 10,
  },
});
