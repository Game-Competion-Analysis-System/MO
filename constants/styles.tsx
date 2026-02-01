import { StyleSheet } from "react-native";

export const styleVariables = {
  mainColor: "#00C8B3",
  mainContainerHorizontalPadding: 30,
  mainContainerVerticalPadding: 20,
  backgroundColor: "#ffffff",
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
});

export const container = StyleSheet.create({
  padding: {
    paddingVertical: styleVariables.mainContainerVerticalPadding,
    paddingHorizontal: styleVariables.mainContainerHorizontalPadding,
    backgroundColor: styleVariables.backgroundColor,
    width: "100%",
    minHeight: "100%",
  },
});
