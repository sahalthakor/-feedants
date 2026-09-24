<<<<<<< HEAD
# Feedants Competition Details — Full Stack Assignment

A full-stack implementation of the Feedants Competition Details screen built for the Feedants Full Stack Development Internship Technical Assignment.

The application implements a functional competition experience rather than a static UI, including competition details, registration, participant capacity, countdowns, submission handling, judging information, rewards, and competition lifecycle states.

## Tech Stack

### Frontend
- React Native
- Expo
- TypeScript
- Expo Router

### Backend
- Node.js
- Express.js
- TypeScript
- tRPC

### Database
- MongoDB
- Database abstraction/fallback used by the application

### Development Tools
- pnpm
- Expo CLI
- Metro Bundler

## Project Structure

```text
feedants-competition/
├── client/
├── mobile/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── assets/
│   └── package.json
├── server/
│   ├── _core/
│   ├── db/
│   ├── routers/
│   └── ...
├── shared/
├── package.json
├── pnpm-lock.yaml
└── README.md
```

## Prerequisites

Install:
- Node.js
- pnpm
- MongoDB (if using MongoDB configuration)
- Expo Go for testing on a physical device

Check versions:

```bash
node -v
pnpm -v
```

Install pnpm if required:

```bash
npm install -g pnpm
```

## Installation

From the project root:

```powershell
cd feedants-competition
pnpm install
```

Install mobile dependencies:

```powershell
cd mobile
pnpm install
cd ..
```

## Running the Backend

Open Terminal 1.

From the project root:

```powershell
$env:NODE_ENV="development"
pnpm exec tsx watch server/_core/index.ts
```

Expected output:

```text
Server running on http://localhost:3000/
```

Keep this terminal running while using the application.

## Running the React Native Application

Open Terminal 2:

```powershell
cd feedants-competition\mobile
pnpm start
```

Expo will display a QR code.

Example:

```text
Metro: exp://<YOUR_LOCAL_IP>:8081
Web: http://localhost:8081
```

## Running on Android

### Android Emulator

Start Expo:

```powershell
pnpm start
```

Then press `a`, or run:

```powershell
pnpm exec expo start --android
```

### Physical Android Device

1. Install Expo Go.
2. Connect the phone and computer to the same Wi-Fi network.
3. Run:

```powershell
pnpm start
```

4. Scan the QR code using Expo Go.

## Running the Web Version

From `feedants-competition\mobile`:

```powershell
pnpm exec expo start --web
```

Or open:

```text
http://localhost:8081
```

## Backend and Mobile Networking

When using a physical phone, `localhost` refers to the phone itself, not the development computer.

Find the computer's local IP:

```powershell
ipconfig
```

Example:

```text
IPv4 Address: 192.168.1.105
```

If the application requires an API URL, configure:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.105:3000
```

Replace the IP address with the development machine's local IP address.

The phone and computer must be connected to the same network.

## Application Flow

### 1. Competition Details

The application displays:
- Competition name
- Prize pool
- Entry fee
- Participant availability
- Competition dates
- Countdown
- Judge information
- Important dates
- Previous winners
- Competition description
- Judging parameters
- Rules and eligibility
- Rewards

### 2. Registration

Users can register for an available competition.

The registration flow handles:
- Registration state
- Participant count
- Competition capacity
- Duplicate registration prevention
- Competition availability

### 3. Competition Capacity

Remaining participation slots are tracked by the application.

The backend validates registration rather than relying only on frontend state. This helps prevent invalid registrations when multiple users attempt to register.

### 4. Competition Lifecycle

Competition dates are used to determine the current competition state.

The application can reflect states such as:
- Upcoming
- Registration/participation period
- Submission period
- Competition ended

Actions are validated according to the current competition state.

### 5. Submission

Registered participants can access the submission functionality when the competition allows submissions.

Submission validation is performed using backend business rules.

### 6. Competition Information Tabs

The application provides:
- About Competition
- Judging Parameters
- Rules & Eligibility

## Database Configuration

If MongoDB configuration is required, create a `.env` file:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/
MONGODB_DB=feedants
```

Replace the values with the appropriate MongoDB credentials.

Do not commit credentials to GitHub.

## Environment Variables

Example:

```env
NODE_ENV=development

MONGODB_URI=<YOUR_MONGODB_CONNECTION_STRING>
MONGODB_DB=feedants

EXPO_PUBLIC_API_URL=http://localhost:3000
```

For a physical device, replace `localhost` with the development machine's local network IP.

## Security

Do not commit:
- `.env`
- `.env.local`
- Database passwords
- API keys
- OAuth secrets
- Private credentials

Use environment variables for sensitive configuration.

## Testing

From the project root:

### Test suite

```powershell
pnpm test
```

### Project checks

```powershell
pnpm check
```

### Production build

```powershell
pnpm build
```

### Mobile TypeScript check

```powershell
cd mobile
pnpm exec tsc --noEmit
```

### Expo web export

```powershell
pnpm exec expo export --platform web
```

## Troubleshooting

### Windows: `'NODE_ENV' is not recognized`

Use PowerShell syntax:

```powershell
$env:NODE_ENV="development"
pnpm exec tsx watch server/_core/index.ts
```

### pnpm: `packages field missing or empty`

If this occurs inside the `mobile` directory because of the mobile-level workspace configuration:

```powershell
Remove-Item .\pnpm-workspace.yaml
pnpm install
pnpm start
```

### OAuth Configuration Warning

If the backend displays:

```text
OAUTH_SERVER_URL is not configured
```

but also displays:

```text
Server running on http://localhost:3000/
```

the development server has started successfully. OAuth functionality requires the corresponding environment configuration when authentication through the OAuth server is required.

### `Missing session cookie`

A message such as:

```text
[Auth] Missing session cookie
```

means a request was received without an authentication session cookie. This does not necessarily mean the backend has crashed.

### Phone Cannot Connect to Backend

1. Ensure the phone and computer are on the same Wi-Fi.
2. Run `ipconfig`.
3. Find the computer's IPv4 address.
4. Configure the API URL using that address.
5. Restart Expo.

Example:

```text
http://192.168.1.105:3000
```

## Production Considerations

The implementation includes production-oriented considerations such as:
- Backend validation
- Competition state handling
- Registration state
- Participant capacity
- Dynamic competition data
- Separation of frontend and backend concerns
- Reusable components
- Typed application code
- Database-backed application architecture
- Handling of concurrent registration scenarios

Possible production additions:
- Production MongoDB cluster
- Secure secret management
- HTTPS
- Production authentication/OAuth configuration
- Cloud object storage for submission files
- Rate limiting
- Monitoring and logging
- CI/CD
- Automated database migrations
- CDN/static asset delivery
- Horizontal backend scaling

## Assumptions

- Competition information is maintained by the backend/database.
- Competition availability depends on the configured competition lifecycle.
- Registration and submission actions are validated by backend business rules.
- Participant capacity must be respected when multiple users attempt registration.
- Mobile clients communicate with the backend through the configured API endpoint.
- Development configuration is different from production configuration.

## Technical Decisions

### React Native + Expo
Expo was used to simplify development, testing, and deployment of the React Native application.

### Node.js + Express
The backend provides the application API and business logic independently of the mobile UI.

### TypeScript
TypeScript is used to improve type safety and maintainability.

### MongoDB
MongoDB provides a flexible document-oriented data model for competition and participation data.

### Backend Validation
Important business rules are handled by the backend instead of trusting only client-side validation.

## Trade-offs

The project prioritizes separation between the mobile interface, backend logic, and database layer.

Production infrastructure such as distributed caching, advanced observability, cloud storage, and deployment automation would require additional infrastructure beyond the internship assignment scope.

## Future Improvements

Potential future improvements include:
- Full authentication and authorization
- Admin competition management dashboard
- Cloud storage for video submissions
- Push notifications
- Advanced rate limiting
- Redis caching
- Distributed locking for high-volume registration
- CI/CD pipeline
- Comprehensive integration and end-to-end tests
- Production monitoring and alerting
- Advanced analytics
- Competition moderation tools

## Demo Checklist

Before submitting:
- [ ] Backend starts successfully
- [ ] Mobile application starts successfully
- [ ] Competition details load
- [ ] Competition data comes from backend
- [ ] Registration works
- [ ] Duplicate registration is handled
- [ ] Participant capacity is respected
- [ ] Countdown/date states work
- [ ] Submission flow works
- [ ] Competition information sections work
- [ ] Backend validation works
- [ ] Tests/checks pass
- [ ] No secrets are committed
- [ ] README instructions work on a clean environment
- [ ] Screen recording is prepared

## Submission

The final submission should include:
1. GitHub repository containing the complete source code
2. README with setup and running instructions
3. Required environment variable documentation
4. Short screen recording demonstrating the working application

## Author

**Sahal Thakor**

Full Stack Development Assignment  
Feedants
=======
# -feedants
project
>>>>>>> c4043397063250d7a1bb2dfb06160e43063cba7f
