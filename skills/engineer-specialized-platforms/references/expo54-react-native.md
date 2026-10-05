# Expo 54 and React Native

Use for an assigned native-product task when the repository confirms the recorded baseline: Expo SDK 54, React Native 0.81.5, Reanimated 4.1.1, Worklets 0.5.1, Gesture Handler 2.28, and expo-haptics 15. Liravo is the recorded example. Inspect the actual lockfile, app config, navigation, native build setup, and package APIs; do not treat this list as an installation instruction.

The [Expo SDK 54 Reanimated reference](https://docs.expo.dev/versions/v54.0.0/sdk/reanimated/) identifies the compatible 4.1 line and Expo Babel configuration. Match this with the installed package and New Architecture setting. Keep a working preset; do not add duplicate plugins or silently switch architecture. Use [SDK54 Gesture Handler](https://docs.expo.dev/versions/v54.0.0/sdk/gesture-handler/) and [SDK54 Haptics](https://docs.expo.dev/versions/v54.0.0/sdk/haptics/) for matching behavior rather than Expo's newest examples.

## Implement in the existing application

Preserve navigation, identifiers, permission declarations, signing, secure storage, and release channels unless changing them is authorized. Native tabs, native menus, new header options, or Expo UI components from later SDKs are not substitutes for the established navigation. Check installed exports and types before using them.

Maintain safe areas, platform touch targets, accessible names/roles, text scaling, keyboard avoidance, and recoverable errors. Distinguish native device behavior from React Native Web. Request only permissions the assigned capability needs and handle denied/revoked states. Store credentials through the established secure mechanism, never in application logs or committed fixtures.

For animations, use the assigned animate-expo guide conditionally: existing compatible libraries, per-frame work on the appropriate runtime, business effects only at the action boundary, cancellation, and reduced motion. A motion task does not authorize installing Skia, a keyboard-controller package, or a new animation framework. Haptics are supplemental and may be suppressed by device/system conditions.

## Evidence

Run applicable type checks and existing tests. Observe the affected screen's navigation, interaction, and failure states on an available supported environment. Distinguish browser rendering, emulator/simulator, development build, and physical release build. Only claim native timing, haptic feel, or physical-device support from the corresponding observation. If no device is available, complete the independent work and return the exact pending device check; do not invent a pass or ask the user to coordinate routine engineering.
