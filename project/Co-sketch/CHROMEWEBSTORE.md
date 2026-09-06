# Chrome Web Store Listing — Co-Sketch

> Last Updated: 2026-09-06

## Store Listing

**Extension Name** [REQUIRED]
Co-Sketch - Real-Time Collaborative Whiteboard

**Short Description** [REQUIRED]
Real-time collaborative sketching, whiteboard canvas, and team chat powered by WebSockets.

**Detailed Description** [REQUIRED]
Co-Sketch is a real-time collaborative whiteboard and canvas designed for teams, designers, and students to brainstorm and draw together instantly.

Features:
- Instant real-time multi-user drawing sync powered by WebSockets and Redis.
- Full suite of sketching tools: brush, shapes, highlighter, eraser, and color pickers.
- Real-time room chat to communicate with teammates directly while sketching.
- Seamless authentication with Google and GitHub.

How to Use:
1. Click the Co-Sketch icon in your browser toolbar to open your collaborative whiteboard.
2. Sign in with Google or GitHub (or join a squad room).
3. Share the room ID with your teammates to sketch and collaborate simultaneously.

Privacy & Data Use:
Co-Sketch only requests authentication profile information (name, avatar, email) to display your user identity inside collaborative rooms. Your sketch data is only transmitted to active room members.

Support & Feedback:
For feedback, bug reports, or feature requests, visit our GitHub repository: https://github.com/Hiteshpy07/redis-websocket

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Provides a real-time collaborative whiteboard and room chat for remote teams.

**Primary Language** [REQUIRED]
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ⬜ Not created | `icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | `screenshot-canvas.png` |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | `screenshot-chat.png` |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | `promo-small.png` |

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `identity` | permissions | Required to facilitate secure Google & GitHub OAuth login via Chrome's WebAuthFlow. |
| `storage` | permissions | Required to store user session token and room preferences locally across browser sessions. |
| `tabs` | permissions | Used to open the Co-Sketch whiteboard canvas in a dedicated full browser tab when clicking the action icon. |
| `https://api.yourdomain.com/*` | host_permissions | Required to connect to backend REST authentication endpoints and sync room state. |
| `wss://api.yourdomain.com/*` | host_permissions | Required to establish real-time WebSocket connection for live drawing synchronization. |

---

## Privacy & Data Use

### Data Collection
**Does the extension collect user data?** Yes

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Authentication info (OAuth Token, Email, Name) | Yes | Yes (to auth server) | User authentication and avatar display in whiteboard rooms | No |
| User activity (Drawing strokes & Chat messages) | Yes | Yes (to socket server) | Real-time multi-user synchronization | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy
**Privacy Policy URL** [REQUIRED]
https://hiteshpy07.github.io/redis-websocket/privacy.html (or your public privacy policy URL)

---

## Distribution
- **Visibility**: Public
- **Regions**: All regions
- **Pricing**: Free

## Developer Info
**Publisher Name**: Hitesh
**Contact Email**: [Your developer contact email]
