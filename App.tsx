import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./src/screens/HomeScreen";
import CreateReportScreen from "./src/screens/CreateReportScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Hjem" }} />
        <Stack.Screen name="CreateReport" component={CreateReportScreen} options={{ title: "Ny rapport" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}