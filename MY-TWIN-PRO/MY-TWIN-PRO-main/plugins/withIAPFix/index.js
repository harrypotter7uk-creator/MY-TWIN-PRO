const { withAppBuildGradle } = require('@expo/config-plugins');

const withIAPFix = (config) => {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes("missingDimensionStrategy")) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {
        missingDimensionStrategy 'store', 'play'`
      );
    }
    return cfg;
  });
};

module.exports = withIAPFix;
