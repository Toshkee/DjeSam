// Adopts the UIKit scene-based life cycle, which apps built with the iOS 27 SDK must use
// (they assert at launch otherwise). Expo SDK 57 ships `ExpoAppSceneDelegate` but its app
// template still starts React Native from the app delegate; this plugin switches it over.
// Remove once the project moves to an Expo SDK whose template does this itself (SDK 58+).
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const START_BLOCK = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle expects a Swift AppDelegate');
    }
    let src = cfg.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    }
    // The scene delegate creates the window and starts React Native into it.
    src = src.replace(START_BLOCK, '\n    // React Native is started by ExpoAppSceneDelegate (scene life cycle).\n');
    if (!src.includes('ExpoReactNativeFactoryProvider') || START_BLOCK.test(src)) {
      throw new Error('withSceneLifecycle could not patch AppDelegate.swift; the template has changed');
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneManifest(withSceneAppDelegate(config));
};
