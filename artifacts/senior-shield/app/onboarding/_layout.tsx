import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="fast-track" />
      <Stack.Screen name="welcome-tour" />
      <Stack.Screen name="health-awareness" />
    </Stack>
  );
}
