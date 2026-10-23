# VoiceBridge

An accessibility-first voice assistant for smart home control. It is built for people with speech impairment or motor difficulty. VoiceBridge remembers how a person actually speaks, always asks for confirmation before acting, and lets a caregiver set up personal commands and one-word shortcuts (like "Bedtime") from a simple portal.

Built for the Amazon Developer Hackathon 2026.

## What it does

- **Caregiver portal:** add commands, create shortcuts, see what the assistant has learned, and read logs.
- **Talk to VoiceBridge:** type or say a command. VoiceBridge asks "Do you want me to...?" and acts only after the user says Yes.
- **Shortcuts:** one word (for example "bedtime") runs several steps at once: light off, fan on, door locked.
- **Virtual Home:** shows the live state of simulated devices (light, fan, door, TV), refreshed every 2 seconds.

## Architecture

Portal (React) -> Amazon API Gateway -> AWS Lambda -> Amazon DynamoDB

Devices are simulated. Their state is stored in DynamoDB and shown in the portal.

## Tech stack

- React + Vite (caregiver portal)
- Amazon API Gateway
- AWS Lambda
- Amazon DynamoDB
- Git and GitHub

## API

Base URL: https://ook5dsr71i.execute-api.ap-southeast-2.amazonaws.com

GET /commands, POST /commands, GET /shortcuts, POST /shortcuts, GET /variants, GET /logs, GET /devices, POST /perform, POST /runshortcut

## Setup and run

You need Node.js (LTS).

1. Clone the repo:
   git clone https://github.com/rutujapatil2580-cmd/voicebridge.git
2. Go into the folder and switch branch:
   cd voicebridge
   git checkout rutuja-portal
3. Install and start the portal:
   cd portal
   npm install
   npm run dev
4. Open the local link shown in the terminal (for example http://localhost:5173).

The portal talks to the deployed API, so no extra configuration is needed.

## Try it

1. Open "Talk to VoiceBridge", type `light on`, press Send, then Yes.
2. Open "Virtual Home" and see the light change.
3. Type `bedtime`, Send, Yes. The light turns off, the fan turns on, the door locks.

## Limitations

- Devices are simulated. Real smart home integration is future work.
- Matching in the portal is simple (exact text). Smarter matching for misheard words is [TEAM: add what Revati built, or write "future work"].
- VoiceBridge learns from user corrections. It does not train a voice model.
- No medical or clinical claims are made.

## Future scope

- Caregiver login, user consent, and a data delete option (the portal holds personal data)
- Real smart home devices
- Validation with real caregivers and users

## License

MIT
