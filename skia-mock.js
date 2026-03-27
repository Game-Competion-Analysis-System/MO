// Stub for @shopify/react-native-skia — only SVGRenderer is used in this project.
const { View } = require('react-native');
const { useRef } = require('react');

module.exports = {
  Canvas: View,
  useCanvasRef: () => useRef(null),
};
