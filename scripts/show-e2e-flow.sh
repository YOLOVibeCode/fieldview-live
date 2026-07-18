#!/bin/bash
# Quick E2E Test Demo
# Shows what the tests do in a visual way

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════╗
║                  GAME CHAT E2E TEST FLOW                             ║
║                  Full Conversation Simulation                        ║
╚══════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 1: Two-Viewer Full Conversation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────┐                    ┌─────────────────────┐
│   Alice's Browser   │                    │    Bob's Browser    │
│   (Context A)       │                    │    (Context B)      │
└──────────┬──────────┘                    └──────────┬──────────┘
           │                                          │
           │ 1. Navigate to /direct/test-e2e-chat    │
           ├─────────────────────────────────────────►│
           │                                          │
           │ 2. Fill unlock form:                    │
           │    - alice@test.com                     │
           │    - Alice Smith                        │
           │    - Click "Unlock"                     │
           │                                          │
           │ ✓ See chat panel                        │
           │                                          │
           │                         3. Fill unlock form:
           │                            - bob@test.com
           │                            - Bob Jones
           │                            - Click "Unlock"
           │                                          │
           │                         ✓ See chat panel │
           │                                          │
           │ 4. Type: "Hey Bob! Can you see this?"   │
           │    Click Send                            │
           ├─────────────────────────────────────────►│
           │                                          │
           │ ✓ See own message                        │
           │   "Alice S.: Hey Bob! Can you see..."    │
           │                                          │
           │                ✓ Receive message via SSE │
           │                  "Alice S.: Hey Bob!..." │
           │                                          │
           │                    5. Type: "Yes! I can see it."
           │                       Click Send         │
           │◄─────────────────────────────────────────┤
           │                                          │
           │ ✓ Receive message via SSE                │
           │   "Bob J.: Yes! I can see it."           │
           │                                          │
           │                    ✓ See own message     │
           │                      "Bob J.: Yes!..."   │
           │                                          │
           │ 6. Type: "Great! Testing this chat."    │
           ├─────────────────────────────────────────►│
           │                                          │
           │                         ✓ Message arrives│
           │                                          │
           │ 7. Test character counter                │
           │    Type 240 'A's                         │
           │    ✓ Shows "240/240"                     │
           │    ✓ Can't type more                     │
           │                                          │
           │ 8. Test empty message                    │
           │    Clear input                           │
           │    ✓ Send button disabled                │
           │                                          │
           │ 9. Both verify:                          │
           │    ✓ Messages in newest-first order      │
           │    ✓ Connection shows "● Live"           │
           │    ✓ Same message count on both sides    │
           │                                          │
           └────────────── ✅ TEST PASSED ─────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 2: Three-Way Conversation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────┐         ┌──────────┐         ┌──────────┐
│  Alice   │         │   Bob    │         │ Charlie  │
│ Browser  │         │ Browser  │         │ Browser  │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │ 1. All navigate and unlock             │
     │                    │                    │
     │ 2. "Hi everyone!" ────────────────────► │
     │ ─────────────────────────────────────► │
     │                    │                    │
     │                    │ ✓ Received         │
     │                    │                 ✓ Received
     │                    │                    │
     │              3. "Hey Alice!" ──────────►│
     │ ◄────────────────────────────────────── │
     │                    │                    │
     │ ✓ Received         │                 ✓ Received
     │                    │                    │
     │                    │         4. "Hello both!"
     │ ◄───────────────────────────────────────┤
     │                    │ ◄──────────────────┤
     │                    │                    │
     │ ✓ Received      ✓ Received              │
     │                    │                    │
     └────────────── ✅ TEST PASSED ────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 3: Late Joiner Sees History
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Timeline:

T=0s    Alice joins, unlocks
T=1s    Alice: "First message"     ─┐
T=2s    Alice: "Second message"     ├─ Stored in DB
T=3s    Alice: "Third message"     ─┘
        
T=5s    Bob joins, unlocks
        └─► SSE sends snapshot:
            [
              "Third message",   ← newest first
              "Second message",
              "First message"
            ]
        
        Bob sees all 3 messages immediately! ✓
        
        ✅ TEST PASSED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 4: Identity Persistence
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────┐
│  Browser                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Navigate to /direct/test-e2e-chat                      │
│     See unlock form                                         │
│                                                             │
│  2. Fill form:                                              │
│     - persistent@test.com                                   │
│     - Persistent User                                       │
│     Click "Unlock"                                          │
│                                                             │
│  3. ✓ Chat panel appears                                    │
│     └─► localStorage.setItem('viewer_identity', {...})     │
│                                                             │
│  4. Press F5 (refresh page)                                 │
│                                                             │
│  5. Page loads...                                           │
│     └─► localStorage.getItem('viewer_identity')            │
│     └─► Found! Skip unlock form                            │
│                                                             │
│  6. ✓ Chat panel appears immediately                        │
│     ✓ No unlock form shown                                  │
│                                                             │
│     ✅ TEST PASSED                                          │
└─────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quick Start:
  ./scripts/test-chat-e2e.sh

Manual:
  cd apps/web
  npx playwright test game-chat.spec.ts

Debug (see browsers):
  cd apps/web
  npx playwright test --headed

Step through:
  cd apps/web
  npx playwright test --debug

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT GETS VERIFIED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Real-time message delivery (SSE)
✓ Bi-directional communication
✓ Multi-viewer scalability (2, 3, N viewers)
✓ Message ordering (newest first)
✓ Character limits (240 enforced)
✓ Empty message prevention
✓ Display name formatting
✓ Connection indicators
✓ Message persistence (DB + late joiners)
✓ Identity persistence (localStorage)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

