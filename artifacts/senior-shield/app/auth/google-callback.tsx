import * as WebBrowser from "expo-web-browser";
import { View, ActivityIndicator } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function GoogleCallbackScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}
