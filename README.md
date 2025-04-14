# ChatApp Frontend 👋

This is the frontend mobile application for ChatApp, built using [Expo](https://expo.dev) and [React Native](https://reactnative.dev/).

## Overview

ChatApp is a secure messaging application designed for real-time communication. This frontend provides the user interface for interacting with the ChatApp backend services, including user authentication, conversation management, and messaging.

**Note:** This frontend application requires the corresponding ChatApp backend service to be running and accessible. The backend handles data storage, authentication logic, and core messaging features. Without the backend, this application will not function. The backend code is private due to privacy and security reasons and not publicly available.

## Key Features

*   **User Authentication:** Secure login and registration using JWT.
*   **Real-time Messaging:** Send and receive messages instantly within conversations.
*   **Conversation Management:** View, start, and manage chat conversations.
*   **Secure Messaging:** Features like primary and secondary codes for enhanced message privacy.
*   **Theme Switching:** Supports light, dark, and system theme preferences.
*   **State Management:** Uses Redux Toolkit for predictable state management.
*   **Navigation:** File-based routing powered by Expo Router.

## Tech Stack

*   **Framework:** Expo (React Native)
*   **Language:** TypeScript
*   **State Management:** Redux Toolkit
*   **Navigation:** Expo Router
*   **UI Components:** React Native core components, custom components
*   **Icons:** @expo/vector-icons (Ionicons)

## Get started

1.  **Install dependencies**

    ```bash
    npm install
    # or
    yarn install
    ```

2.  **Configure Environment**
    *   You might need to set up environment variables (e.g., API URL) in app.json.

3.  **Start the app**

    ```bash
     npx expo start
    ```

    In the output, you'll find options to open the app in a:

    *   [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
    *   [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
    *   [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
    *   [Expo Go](https://expo.dev/go) (May have limitations depending on native modules used)

## Project Structure

*   **`app/`**: Contains all screens and navigation logic using Expo Router's file-based routing.
    *   **`(auth)/`**: Authentication-related screens (Login, Register).
    *   **`(tabs)/`**: Main application screens after login (Chats, Profile).
    *   **`chat/`**: Chat-specific screens and layouts.
    *   **`store/`**: Redux Toolkit setup (store, slices, hooks).
*   **`assets/`**: Static assets like images and fonts.
*   **`components/`**: Reusable UI components used across the application.
*   **`constants/`**: Shared constants like color definitions.
*   **`hooks/`**: Custom React hooks (e.g., `useAppTheme`).
*   **`utils/`**: Utility functions (e.g., logging, debugging).

## Learn more

To learn more about the technologies used, refer to their official documentation:

*   [Expo Documentation](https://docs.expo.dev/)
*   [React Native Documentation](https://reactnative.dev/docs/getting-started)
*   [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
*   [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
