const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const tslibPath  = path.resolve(__dirname, 'node_modules/tslib/tslib.js');
const skiaMockPath = path.resolve(__dirname, 'skia-mock.js');

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return { filePath: tslibPath, type: 'sourceFile' };
  }
  if (moduleName === '@shopify/react-native-skia') {
    return { filePath: skiaMockPath, type: 'sourceFile' };
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
