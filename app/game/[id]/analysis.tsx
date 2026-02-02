import { files } from "@/constants/files";
import { container, headers, styleVariables } from "@/constants/styles";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import moment from "moment";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function AnalysisScreen() {
  const monthYearString = moment().format("MMMM YYYY");

  return (
    <ScrollView contentContainerStyle={[container.padding, container.gap]}>
      {/* Montlty Analytics section */}
      <View style={[container.rowContainer, styles.monthlyFilterHeaderSection]}>
        <Text style={headers.h1}>Monthly Analytics</Text>
        <Pressable
          style={[
            styles.button,
            styles.buttonHighlight,
            container.rowContainer,
          ]}
        >
          <Text style={styles.monthlyFilterText}>Month</Text>
          <FontAwesome6 name="arrow-down-short-wide" size={18} color="black" />
        </Pressable>
      </View>
      <View style={[container.rowContainer, styles.monthlyAnalyticSections]}>
        <View
          style={[
            styles.monthlyAnalyticSection,
            styles.generalSectionInformation,
          ]}
        >
          <Text style={headers.h4}>Total analyses</Text>
          <Text style={headers.h1}>240</Text>
          <View
            style={[
              styles.generalSectionInformationBottomLine,
              { backgroundColor: "#9333EA" },
            ]}
          ></View>
        </View>
        <View
          style={[
            styles.monthlyAnalyticSection,
            styles.generalSectionInformation,
          ]}
        >
          <Text style={headers.h4}>Avg. Accurracy</Text>
          <Text style={headers.h1}>96.5%</Text>
          <View
            style={[
              styles.generalSectionInformationBottomLine,
              { backgroundColor: "#22C55E" },
            ]}
          ></View>
        </View>
      </View>
      <View style={[container.rowContainer, styles.monthlyAnalyticSections]}>
        <View
          style={[
            styles.monthlyAnalyticSection,
            styles.generalSectionInformation,
          ]}
        >
          <Text style={headers.h4}>Avg. Analysis Time</Text>
          <Text style={headers.h1}>1.80s</Text>
          <View
            style={[
              styles.generalSectionInformationBottomLine,
              { backgroundColor: "#2563EB" },
            ]}
          ></View>
        </View>
        <View
          style={[
            styles.monthlyAnalyticSection,
            styles.generalSectionInformation,
          ]}
        >
          <Text style={headers.h4}>Unique Players</Text>
          <Text style={headers.h1}>45</Text>
          <View
            style={[
              styles.generalSectionInformationBottomLine,
              { backgroundColor: "#EA580C" },
            ]}
          ></View>
        </View>
      </View>

      {/* Graph section */}
      <Text style={headers.h1}>Year-Round trends</Text>
      <View style={container.rowContainer}>
        <Pressable style={[styles.button, styles.buttonHighlight]}>
          <Text style={styles.graphButtonHighlightText}>Line Chart</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonUnHighlight]}>
          <Text style={{ color: styleVariables.unHighlightTextColor }}>
            Bar Chart
          </Text>
        </Pressable>
      </View>
      <View style={styles.graphContainer}>
        <Text style={headers.h2}>Trends</Text>
        <Image
          source={files.graphImageExample}
          style={{
            width: "100%",
            height: 292,
          }}
        />
      </View>
      {/* Month details section */}
      <Text style={headers.h1}>{monthYearString} Details</Text>
      <View
        style={[
          styles.generalSectionInformation,
          styles.monthDetailSectionInformation,
          {
            backgroundColor: "#F0FDF4",
            borderColor: "#BBF7D0",
          },
        ]}
      >
        <Text style={{ color: "#15803D" }}>Accuracy</Text>
        <Text style={[headers.h2, { color: "#16A34A" }]}>96.5%</Text>
      </View>
      <View
        style={[
          styles.generalSectionInformation,
          styles.monthDetailSectionInformation,
          {
            backgroundColor: "#EFF6FF",
            borderColor: "#BFDB",
          },
        ]}
      >
        <Text style={{ color: "#1D4ED8" }}>Avg Analysis Time</Text>
        <Text style={[headers.h2, { color: "#2563EB" }]}>1.8 s</Text>
      </View>
      <View
        style={[
          styles.generalSectionInformation,
          styles.monthDetailSectionInformation,
          {
            backgroundColor: "#FAF5FF",
            borderColor: "#E9D5FF",
          },
        ]}
      >
        <Text style={{ color: "#7E22CE" }}>Unique Players</Text>
        <Text style={[headers.h2, { color: "#9333EA" }]}>45</Text>
      </View>
      <View
        style={[
          styles.generalSectionInformation,
          styles.monthDetailSectionInformation,
          {
            backgroundColor: "#FFF7ED",
            borderColor: "#FED7AA",
          },
        ]}
      >
        <Text style={{ color: "#C2410C" }}>Top Event</Text>
        <Text style={[headers.h2, { color: "#EA580C" }]}>
          Festival of Warriors
        </Text>
      </View>
      {/* Performance metrics section */}
      <Text style={headers.h1}>Performance Metrics</Text>
      <View
        style={[
          styles.generalSectionInformation,
          styles.performanceMetricSectionInformation,
          {
            backgroundColor: "#00c8b441",
            borderColor: "#1CCFCF",
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 12,
            gap: 6,
          },
        ]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={headers.h4}>vs Monthly Average</Text>
          <Text style={{ color: "#33CFEA" }}>-326 analyses</Text>
        </View>
        <View
          style={[
            styles.generalSectionInformationBottomLine,
            { backgroundColor: "#DED5D3", height: 8 },
          ]}
        ></View>
      </View>
      <View style={container.rowContainer}>
        <View
          style={[
            styles.generalSectionInformation,
            styles.performanceMetricSectionInformation,
          ]}
        >
          <Text style={headers.h4}>Accuracy Grade</Text>
          <Text style={headers.h1}>B</Text>
        </View>
        <View
          style={[
            styles.generalSectionInformation,
            styles.performanceMetricSectionInformation,
          ]}
        >
          <Text style={headers.h4}>Speed Rank</Text>
          <Text style={headers.h1}>Fair</Text>
        </View>
      </View>
      <View
        style={[
          styles.generalSectionInformation,
          styles.performanceMetricSectionInformation,
        ]}
      >
        <Text style={headers.h4}>Growth Trend</Text>
        <Text style={headers.h1}>Downward trend</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonHighlight: {
    backgroundColor: styleVariables.mainColor,
  },
  buttonUnHighlight: {
    backgroundColor: "#DED5D3",
  },
  monthlyFilterHeaderSection: {
    justifyContent: "space-between",
  },
  monthlyFilterText: {
    fontWeight: "bold",
  },
  monthlyAnalyticSections: {
    gap: 20,
  },
  generalSectionInformation: {
    padding: 4,
    borderRadius: 12,
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  monthlyAnalyticSection: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
  },
  generalSectionInformationBottomLine: {
    width: "100%",
    height: 4,
    borderRadius: 12,
  },
  graphButtonHighlightText: {
    color: "#ffffff",
  },
  graphContainer: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: styleVariables.borderColor,
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  monthDetailSectionInformation: {
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  performanceMetricSectionInformation: {
    paddingVertical: 16,
    backgroundColor: "#ded5d385",
  },
});
