# Privacy Policy for DeskDeck-Solo

**Last updated:** May 2026

DeskDeck-Solo is designed with privacy and local security as top priorities.

## 1. Local-First & Zero Data Collection
- **DeskDeck-Solo operates entirely locally on your device.**
- No user data, usage analytics, personal identifiers, browsing history, or deck configurations are ever collected, transmitted, or stored on external servers or third-party services.

## 2. Chrome Storage API Usage
- Settings and preset deck configurations are saved locally in your browser using Chrome's `chrome.storage.local` API.
- These data remain strictly within your local Chrome profile and are never synced externally.

## 3. Permissions Explanation
- **`sidePanel`**: Used to render the virtual hardware deck controller within Chrome's Side Panel UI.
- **`storage`**: Used to store user deck preferences, knob levels, toggle states, and custom shortcuts locally.
- **`tabs`**: Used to interact with active tabs for media playback control, tab switching, and reading mode adjustments.
- **`audio`**: Used for local audio feedback or sound level controls.
- **`power`**: Used optionally to prevent screen sleep/dimming during active tablet deck usage.

## 4. Third-Party Services
- DeskDeck-Solo uses zero third-party analytics, tracking scripts, or external API endpoints.

## 5. Contact & Support
If you have any questions or concerns regarding privacy, please open an issue in the official project repository.
