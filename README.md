# Memo - React Native App with Expo, TypeScript and Supabase

A React Native application built with Expo, TypeScript and Supabase for authentication and backend services.

## Features

- 🔐 User authentication (Sign up, Sign in, Sign out)
- 📱 Cross-platform (iOS, Android, Web)
- ⚡ Built with Expo for rapid development
- 🗄️ Supabase for backend services
- 🎨 Clean and modern UI
- 📝 Full TypeScript support with type safety

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI
- Supabase account

## Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Get your project URL and anon key from the API settings
   - Update the `.env` file with your actual Supabase credentials:
     ```
     EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```
   - Replace `your-project-id` with your actual Supabase project ID
   - Replace `your-supabase-anon-key` with your actual anon key from Supabase dashboard

3. **Run the app:**
   ```bash
   npm start
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── AuthForm.tsx    # Authentication form
├── screens/            # Screen components
│   └── HomeScreen.tsx  # Main home screen
├── hooks/              # Custom React hooks
│   └── useAuth.ts      # Authentication hook
├── services/           # External service integrations
│   └── supabase.ts     # Supabase client configuration
├── constants/          # App constants
│   └── config.ts       # Configuration constants
├── types/              # TypeScript type definitions
│   └── auth.ts         # Authentication types
└── utils/              # Utility functions
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

## Authentication Flow

The app includes a complete authentication system:

1. **Sign Up**: Users can create new accounts with email/password
2. **Sign In**: Existing users can log in
3. **Protected Routes**: Authenticated users see the home screen
4. **Sign Out**: Users can securely sign out

## Supabase Configuration

The app uses Supabase for:
- User authentication
- Session management
- Secure data storage

Make sure to configure your Supabase project with the appropriate authentication settings and policies.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. 