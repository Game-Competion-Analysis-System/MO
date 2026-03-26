import { StyleSheet } from "react-native";

export const styleVariables = {
  mainColor: "#00C8B3",
  mainContainerHorizontalPadding: 30,
  mainContainerVerticalPadding: 20,
  backgroundColor: "#ffffff",
  borderColor: "#EBE2E0",
  unHighlightTextColor: "#7E6B67",
};

export const headers = StyleSheet.create({
  h1: {
    fontSize: 24,
    fontWeight: "bold",
  },
  h2: {
    fontSize: 20,
    fontWeight: "bold",
  },
  h3: {
    fontSize: 16,
    fontWeight: "bold",
  },
  h4: {
    fontSize: 12,
    color: styleVariables.unHighlightTextColor,
  },
});

export const container = StyleSheet.create({
  padding: {
    paddingVertical: styleVariables.mainContainerVerticalPadding,
    paddingHorizontal: styleVariables.mainContainerHorizontalPadding,
    backgroundColor: styleVariables.backgroundColor,
    width: "100%",
    minHeight: "100%",
  },
  gap: {
    gap: 10,
  },
  rowContainer: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
});
