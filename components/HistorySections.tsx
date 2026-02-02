import { container, headers } from "@/constants/styles";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Octicons from "@expo/vector-icons/Octicons";
import { StyleSheet, Text, View } from "react-native";

interface History {
  createdAtDate: string;
  createdAtTime: string;
  percentage: string;
  time: string;
  topPlayerName: string;
  eventName: string;
}

function HistorySection({ section }: { section: History }) {
  return (
    <View style={styles.generalSectionInformation}>
      <View style={styles.imgPreview}></View>
      <View>
        <View style={container.rowContainer}>
          <Text style={headers.h2}>{section.createdAtDate}</Text>
          <Text style={headers.h4}>{section.createdAtTime}</Text>
          <Octicons
            name="tracked-by-closed-completed"
            size={14}
            color="black"
          />
        </View>
        <View style={container.rowContainer}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="lightning-bolt-outline"
              size={14}
              color="black"
            />
            <Text style={headers.h4}>{section.percentage}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="access-time" size={14} color="black" />
            <Text style={headers.h4}>{section.time}</Text>
          </View>
          <Text style={headers.h4}>5 rankings</Text>
        </View>
        <Text style={headers.h4}>
          Top: {section.topPlayerName} • {section.eventName}
        </Text>
      </View>
    </View>
  );
}

export default function HistorySections({
  historySections,
}: {
  historySections: History[];
}) {
  return historySections.map((section, i) => (
    <HistorySection key={i} section={section} />
  ));
}

const styles = StyleSheet.create({
  generalSectionInformation: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#ded5d37f",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  imgPreview: {
    width: 67,
    height: 64,
    borderRadius: 8,
    backgroundColor: "purple",
  },
});
