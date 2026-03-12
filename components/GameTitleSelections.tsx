import { files } from '@/constants/files';
import { headers, styleVariables } from '@/constants/styles';
import { Game } from '@/services/api';
import { useRouter } from 'expo-router';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function GameTitleSection({ game, onPress }: { game: Game; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View style={styles.gameTitleContainer}>
        <Image
          source={files.placeHolderImageGameThumbnail}
          style={{ width: '100%', height: 208 }}
        />
        <View style={styles.gameInfo}>
          <Text style={headers.h2}>{game.gamename}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{game.genre}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function GameTitleSections({ items }: { items: Game[] }) {
  const router = useRouter();

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 16 }}
      data={items}
      keyExtractor={(item) => String(item.gameid)}
      renderItem={({ item }) => (
        <GameTitleSection
          game={item}
          onPress={() => router.push(`/game/${item.gameid}` as any)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  gameTitleContainer: {
    gap: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: styleVariables.borderColor,
  },
  gameInfo: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
  },
});
