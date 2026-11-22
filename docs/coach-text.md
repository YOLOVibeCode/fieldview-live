# Text commands for owners

A runbook for the feature the owner portal calls **Text commands** and the code calls `coach-text`.

## What it is

An owner login keeps a list of mobile phones: its own and its helpers' (an assistant, a parent who
runs the camera). Each phone on the list can text the FieldView number to run commands for the
login's account. One phone can also be on several accounts; it then texts `ACCOUNT` to choose
which one it texts for.

**This release links phones and chooses accounts.** It ships the tables, the phone list, the link
flow, the account choice, pause and resume, the portal page and the audit log. No stream command
runs yet. The page says "Commands arrive with the next update."

- **A list per login, a phone on up to nine accounts.** A login lists up to ten phones. Linking a
  phone to another account adds that account; it never takes the phone from the first. Phones
  hang off a login, not an account, and the account is read through the login on every text.
- **Texts arrive through the Noctusoft relay** at `POST /api/webhooks/twilio`. This repo holds no
  Twilio secret.
- **A text is acted on only when the relay says Twilio signed it.** Every other text goes to
  keyword routing, as before.

| Part           | Where                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| API module     | `apps/api/src/modules/coach-text/`                                                                                                 |
| Owner routes   | `apps/api/src/routes/owners.text-commands.ts`                                                                                      |
| Inbound texts  | `apps/api/src/routes/webhooks.twilio.ts`                                                                                           |
| Portal page    | `apps/web/app/owners/text-commands/page.tsx`                                                                                       |
| Shared schemas | `packages/data-model/src/schemas/coachText.ts`                                                                                     |
| Tables         | `CoachTextLink` (one row per login and phone), `CoachTextPhone` (per phone), `CoachTextSettings` (per login), `CoachTextCommand` (log) |
| Migrations     | `20261122000000_coach_text`, `20261122210000_coach_text_phones`                                                                     |
| API reference  | `openapi/paths/owners.yaml`, under `/owners/me/text-commands`                                                                      |

## Settings

All are optional and are read when used. With none set, the feature is off and the webhook behaves
as it did before.

| Name                              | Default           | Meaning                                                                                  |
| --------------------------------- | ----------------- | ---------------------------------------------------------------------------------------- |
| `COACH_TEXT_ENABLED`              | off               | The switch. On only for `true` or `1`.                                                   |
| `COACH_TEXT_OWNER_ALLOWLIST`      | empty             | Owner account ids that may use it, comma separated. **Empty means every owner account.** |
| `COACH_TEXT_DEFAULT_TIME_ZONE`    | `America/Chicago` | Used until an owner picks a time zone. An IANA name.                                     |
| `COACH_TEXT_NUMBER_E164`          | `+18773435308`    | The number owners text. The default is the FieldView product number.                     |
| `COACH_TEXT_CODE_TTL_SECONDS`     | `600`             | How long a link code lasts.                                                              |
| `COACH_TEXT_LINK_IDLE_DAYS`       | `90`              | Days without a text before a linked phone expires.                                       |
| `COACH_TEXT_QUESTION_TTL_SECONDS` | `600`             | How long a numbered question, such as "Which account?", waits for its answer.            |
| `COACH_TEXT_ACCOUNT_CHOICE_HOURS` | `12`              | How long a phone keeps the account it chose.                                             |

A value that cannot be read (a time zone that does not exist, a number that is not E.164, a count
that is not a whole number above zero) falls back to the default.

**The switch also needs `RELAY_INBOUND_SECRET`.** A text is trusted only when the relay's own
signature on it was checked, and that check needs the shared secret. With the switch on and no
secret, the portal page works but no text is ever acted on.

## How a phone is added

1. The owner signs in and opens **Text commands** from the dashboard (`/owners/text-commands`).
2. They type the person's name (for example Jordan) and the mobile number, and ask for a code. Only
   US and Canadian numbers are accepted.
3. The page shows a six-digit code, and a link that opens the phone's messages app with
   `LINK <code>` filled in. The code lasts ten minutes. The owner gives the code to the person.
4. The person sends that text from that phone to the FieldView number. They need no login.
5. FieldView links the phone, replies, and emails the login. The page checks every three seconds
   and the row turns to **Linked**.

The reply to a phone linked to its first account is:

> FieldView.Live: This phone now runs text commands for (account name). Msg frequency varies. Msg &
> data rates may apply. Reply STOP to pause, HELP for help.

A phone that already works with another account gets:

> FieldView.Live: This phone now runs text commands for (account name) too. It works with 2
> accounts. Text ACCOUNT to choose one. Msg frequency varies. Msg & data rates may apply. Reply STOP
> to pause, HELP for help.

**Why the person texts the code.** A code sent by FieldView would be a text to a number that has
not agreed to get one. The person's own text is the opt-in. Consent for the purpose
`owner_commands` is recorded per phone when that text arrives, not when the form is sent.

## Choosing the account (a phone on several accounts)

- The phone texts `ACCOUNT`. FieldView answers "Which account? 1 Tigers FC (now), 2 Hawks FC. Reply
  with the number, 0 for none." `(now)` marks the account the phone texts for at the moment.
- A digit answers. The phone then texts for that account for `COACH_TEXT_ACCOUNT_CHOICE_HOURS`
  hours, and the reply says until when, in that account's time zone. `0` closes the question and
  changes nothing.
- A phone on one account gets "This phone works with (account name) only."
- The choice is checked on every text. When its link was removed, paused or taken off the
  allowlist, or its account was suspended, the choice no longer counts.
- With the next update, every command starts here. A phone on several accounts with no choice in
  force uses the one account that has a game on now, or is asked first.

## What the page shows

Each phone on the list is in one of these states.

| State               | Meaning                                                                                       | What the owner does                    |
| ------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------- |
| Waiting (`pending`) | Added; its LINK text has not arrived. When the code has run out, the page says so.             | Have the person send the text, or ask for a new code. |
| Linked (`linked`)   | The phone can text commands.                                                                  | Nothing.                               |
| Paused (`paused`)   | The phone texted STOP. FieldView cannot reply to it.                                          | Text START from that phone.            |
| Expired (`expired`) | The phone has not texted for `COACH_TEXT_LINK_IDLE_DAYS` days.                                | Ask for a new code and text it again.  |
| Not turned on       | The switch is off, or the account is not on the allowlist. The list is empty.                 | Nothing. Removing a phone still works. |

## Rules that protect a link

- **The code is never stored.** Only a hash of the link id and the code is kept. The API returns the
  code once, with `Cache-Control: no-store`.
- **Five tries per code.** Tries count only on verified texts from the phone the code was made for,
  so a stranger cannot use them up.
- **Ten codes per owner account in 15 minutes**, whether from adding a phone or asking for a new
  code. The eleventh is refused with a 429.
- **Ten phones per login, nine accounts per phone.** Answers are single digits, so a phone can
  work with at most nine accounts; the tenth LINK text is refused and the phone holder is told why.
- **One answer for every other LINK text that did not link.** Wrong code, expired code, too many
  tries and unknown phone all get "That code did not match or has expired. Open Text commands in
  your FieldView account for a new code."
- **The portal never shows whether another account uses a number.** Adding a number another
  account has changes nothing for that account.
- **Every phone that links, and every linked phone removed, emails the login**, with the person's
  name, the phone masked and a link to the Text commands page.
- **Removing a phone revokes its opt-in only when no other account still has it.**
- **A phone that texted STOP earlier is linked as paused.** No reply goes to it. The email explains
  START.
- **STOP pauses and START resumes, on every account the phone works with.** Both must be verified
  texts.
- **A text delivered twice is acted on once**, by Twilio's message id.
- **Two answers to the same question cannot both win.** The answer is one conditional update.
- **Phone numbers are masked** in API answers and in logs.

## Turning it on

These steps are the owner's. Agents do not set Railway variables.

1. Release the code. The migrations add the tables; `20261122210000_coach_text_phones` reshapes
   `CoachTextLink` and keeps any rows it holds. Apply them the way every FieldView migration is
   applied at release.
2. On the `api` service, set `COACH_TEXT_ENABLED` to `true`. For a first run with one account, also
   set `COACH_TEXT_OWNER_ALLOWLIST` to that owner account's id.
3. Confirm `RELAY_INBOUND_SECRET` is set on the same service.
4. Sign in as that owner. The dashboard shows the **Text commands** card.
5. Add a phone and check that its row turns to Linked and the email arrives.

Before the first real coach uses it:

- **Approve the consent wording.** The sentence under the form comes from
  `buildOwnerCommandsConsentPlain` in `packages/data-model/src/sms/compliance.ts`. The replies are in
  `apps/api/src/modules/coach-text/reply/replies.ts`.
- **Update the toll-free registration.** The approved program describes viewer alerts. Owner
  commands, from the coach's phone and from the helpers' phones the coach adds, are a new use. Add
  them to the registration's use case and sample messages.

## Turning it off

**For everyone:** remove `COACH_TEXT_ENABLED` from the `api` service, or set it to `false`.

**For one account:** take its id off `COACH_TEXT_OWNER_ALLOWLIST`.

> **Do not empty the allowlist to shut out the last account.** An empty list means every owner
> account. To shut out the last account, turn the switch off.

What off means:

- Every text goes to keyword routing, exactly as before the feature existed.
- `GET /api/owners/me/text-commands` answers `enabled: false` with no phones. The dashboard card is
  hidden and the page says "Text commands are not turned on for this account yet."
- Adding a phone, asking for a new code, changing the time zone and reading history answer 403.
- `DELETE /api/owners/me/text-commands/phones/:id` still works, so a phone can always be removed.

What off does not do:

- **It deletes nothing.** Phones stay in `CoachTextLink` and work again when the switch comes back.
- **It does not record a STOP on the link.** While the switch is off, a STOP still opts the phone
  out of viewer texts, and the carrier still blocks replies to it. The link itself is not marked
  paused, so it shows as Linked when the switch comes back. Ask the owner to remove it or to have
  the person text START.

**To remove one phone:** the owner presses Remove on its row. There is no admin screen for it in
this release.

## Seeing what happened

- **In the portal:** the page lists the recent texts tied to the login, each with the name of the
  phone that sent it. The API is `GET /api/owners/me/text-commands/history`.
- **In the table `CoachTextCommand`:** one row for every verified LINK text (stored as
  `LINK ******`), `ACCOUNT` text and answer, with what came of it and the sending phone's name. A
  text that could not be verified is noted only when it comes from a phone on some login's list.
  The note has no body and no login, and there are at most five per phone per hour. The table is
  never pruned and has no foreign keys, so a deleted login does not erase the record.
- **In the API log.** Phones are masked and names are not logged. The messages are:
  - `Coach text phone added`
  - `Coach text phone linked`
  - `Coach text phone removed`
  - `Coach text phone paused by STOP`
  - `Coach text phone resumed by START`
  - `Coach text handling failed; the text goes to the viewer path`

## When it does not work

| What the owner sees                                                     | Cause                                                                                                                                                         | Fix                                                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| On the page: "A text arrived but could not be verified. Send it again." | The relay did not mark the text as signed by Twilio, or the text came without a message id.                                                                   | If it repeats, fix the relay's Twilio signature setup. Do not loosen the check here. |
| The reply "Game not found. Please check your keyword and try again."    | The text was not treated as an owner text, so it went to keyword routing. The switch is off, `RELAY_INBOUND_SECRET` is missing, or the text was not verified. | Check the two settings, then the relay.                                              |
| The reply "That code did not match or has expired."                     | Wrong code, a code older than ten minutes, five wrong tries, or a text from a phone other than the one typed.                                                 | Ask for a new code.                                                                  |
| The reply "This phone already works with 9 accounts."                   | The phone is on nine accounts.                                                                                                                                | Remove it from one of them first.                                                    |
| On the page: "Too many link attempts, please try again later."          | Ten codes for the account in 15 minutes.                                                                                                                      | Wait 15 minutes.                                                                     |
| No reply at all, and the row stays on Waiting.                          | The text did not reach FieldView.                                                                                                                             | Look for the text in the SMS provider's log, then in the relay.                      |
| No reply, and the row turns to Paused.                                  | The phone texted STOP at some earlier time.                                                                                                                   | Text START from that phone.                                                          |
| Expired.                                                                | No text from the phone for `COACH_TEXT_LINK_IDLE_DAYS` days.                                                                                                  | Ask for a new code and text it again.                                                |

## Testing with a real text

- **Every real text to the FieldView number reaches production.** There is no test route for
  inbound texts.
- **A number cannot text itself.** Send from a second number and read both sides in the SMS
  provider's log.
- **Use the allowlist.** Keep `COACH_TEXT_OWNER_ALLOWLIST` on the test accounts until the check
  passes. A phone on two accounts needs both on the list.
- **Not proven by a text from a provider number:** the tap-to-text link on a real phone, and
  delivery on a real carrier.

## Not in this release

- Commands that read or change a stream, and the automatic account choice from a game on now.
- Creating a game page by text.
- Unlinking by text.
- Reading free text with a language model.
- Logins for helpers (team members). A helper's phone needs no login.
