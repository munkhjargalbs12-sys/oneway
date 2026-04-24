import React, { forwardRef, useImperativeHandle } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

export type AppMapRef = {
  animateToRegion: (...args: any[]) => void;
  fitToCoordinates: (...args: any[]) => void;
  takeSnapshot: (...args: any[]) => Promise<string>;
};

type AppMapProps = ViewProps & {
  children?: React.ReactNode;
};

const noop = () => {};

const AppMap = forwardRef<AppMapRef, AppMapProps>(function AppMap(
  { children: _children, style, ...rest },
  ref
) {
  useImperativeHandle(ref, () => ({
    animateToRegion: noop,
    fitToCoordinates: noop,
    takeSnapshot: async () => "",
  }));

  return <View {...rest} style={[styles.surface, style]} />;
});

export function Marker() {
  return null;
}

export function Polyline() {
  return null;
}

export function Circle() {
  return null;
}

export const PROVIDER_GOOGLE = "google";

const styles = StyleSheet.create({
  surface: {
    backgroundColor: "#eef3f6",
  },
});

export default AppMap;
