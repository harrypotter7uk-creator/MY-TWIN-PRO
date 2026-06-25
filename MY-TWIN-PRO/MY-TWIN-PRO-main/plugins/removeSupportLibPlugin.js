const { withProjectBuildGradle } = require('@expo/config-plugins');

const removeSupportLibVersion = (config) => {
  return withProjectBuildGradle(config, (modConfig) => {
    // استبدال أي سطر يحتوي على supportLibVersion بسطر فارغ
    modConfig.modResults.contents = modConfig.modResults.contents.replace(
      /^.*supportLibVersion.*$/gm,
      ''
    );
    return modConfig;
  });
};

module.exports = removeSupportLibVersion;
