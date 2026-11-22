# Text commands for owners

A runbook for the feature the owner portal calls **Text commands** and the code calls `coach-text`.

## What it is

An owner login links one mobile phone in the portal. That phone can then text the FieldView number
to run commands for the login's account.

**This release only links the phone.** It ships the two tables, the link flow, pause and resume,
the portal page and the audit log. No command runs yet. The page says "Commands arrive with the next
update."

- **One phone per login, one login per phone.** A link belongs to a login, not to an account. The
  account is read through the login on every text.
- **Texts arrive through the Noctusoft relay** at `POST /api/webhooks/twilio`. This repo holds no
  Twilio secret.
- **A text is acted on only when the relay says Twilio signed it.** Every other text goes to
  keyword routing, as before.

| Part           | Where                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| API module     | `apps/api/src/modules/coach-text/`                                          |
| Owner routes   | `apps/api/src/routes/owners.text-commands.ts`                               |
| Inbound texts  | `apps/api/src/routes/webhooks.twilio.ts`                                    |
| Portal page    | `apps/web/app/owners/text-commands/page.tsx`                                |
| Shared schemas | `packages/data-model/src/schemas/coachText.ts`                              |
| Tables         | `CoachTextLink`, `CoachTextCommand` (migration `20261122000000_coach_text`) |
| API reference  | `openapi/paths/owners.yaml`, under `/owners/me/text-commands`               |

## Settings

All are optional and are read when used. With none set, the feature is off and the webhook behaves
as it did before.

| Name                           | Default           | Meaning                                                                                  |
| ------------------------------ | ----------------- | ---------------------------------------------------------------------------------------- |
| `COACH_TEXT_ENABLED`           | off               | The switch. On only for `true` or `1`.                                                   |
| `COACH_TEXT_OWNER_ALLOWLIST`   | empty             | Owner account ids that may use it, comma separated. **Empty means every owner account.** |
| `COACH_TEXT_DEFAULT_TIME_ZONE` | `America/Chicago` | Used until an owner picks a time zone. An IANA name.                                     |
| `COACH_TEXT_NUMBER_E164`       | `+18773435308`    | The number owners text. The default is the FieldView product number.                     |
| `COACH_TEXT_CODE_TTL_SECONDS`  | `600`             | How long a link code lasts.                                                              |
| `COACH_TEXT_LINK_IDLE_DAYS`    | `90`              | Days without a text before a linked phone expires.                                       |

A value that cannot be read (a time zone that does not exist, a number that is not E.164, a count
that is not a whole number above zero) falls back to the default.

**The switch also needs `RELAY_INBOUND_SECRET`.** A text is trusted only when the relay's own
signature on it was checked, and that check needs the shared secret. With the switch on and no
secret, the portal page works but no text is ever acted on.

## How a phone is linked

1. The owner signs in and opens **Text commands** from the dashboard (`/owners/text-commands`).
2. They type their mobile number and ask for a code. Only US and Canadian numbers are accepted.
3. The page shows a six-digit code and a link that opens the phone's messages app with
   `LINK <code>` filled in. The code lasts ten minutes.
4. They send that text from that phone to the FieldView number.
5. FieldView links the phone, replies, and emails the login. The page checks every three seconds
   and turns to **Linked**.

The reply to a newly linked phone is:

> FieldView.Live: This phone now runs text commands for (account name). Msg frequency varies. Msg &
> data rates may apply. Reply STOP to pause, HELP for help.

**Why the owner texts the code.** A code sent by FieldView would be a text to a number that has not
agreed to get one. The owner's own text is the opt-in. Consent for the purpose `owner_commands` is
recorded when that text arrives, not when the form is sent.

## What the page shows

| State               | Meaning                                                                                          | What the owner does          |
| ------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------- |
| Not linked (`none`) | No phone is linked.                                                                              | Ask for a code.              |
| Waiting (`pending`) | A code is waiting to be texted. An older linked phone keeps working until the new one is linked. | Send the text.               |
| Linked (`linked`)   | The phone can text commands.                                                                     | Nothing.                     |
| Paused (`paused`)   | The phone texted STOP. FieldView cannot reply to it.                                             | Text START from that phone.  |
| Expired (`expired`) | The phone has not texted for `COACH_TEXT_LINK_IDLE_DAYS` days.                                   | Link it again.               |
| Not turned on       | The switch is off, or the account is not on the allowlist.                                       | Nothing. Unlink still works. |

## Rules that protect a link

- **The code is never stored.** Only a hash of the link id and the code is kept. The API returns the
  code once, with `Cache-Control: no-store`.
- **Five tries per code.** Tries count only on verified texts from the phone the code was made for,
  so a stranger cannot use them up.
- **Five codes per owner account in 15 minutes.** The sixth is refused with a 429.
- **One answer for every LINK text that did not link.** Wrong code, expired code, too many tries
  and unknown phone all get "That code did not match or has expired. Open Text commands in your
  FieldView account for a new code."
- **Every link and unlink emails the login**, with the phone masked and a link to the Text commands
  page. When a phone moves from one login to another, both logins get an email.
- **A phone that texted STOP earlier is linked as paused.** No reply goes to it. The email explains
  START.
- **STOP pauses and START resumes.** Both must be verified texts.
- **A text delivered twice is acted on once**, by Twilio's message id.
- **Phone numbers are masked** in API answers and in logs.

## Turning it on

These steps are the owner's. Agents do not deploy, run migrations or set Railway variables.

1. Release the code. The migration `20261122000000_coach_text` adds two tables and changes no
   existing one. Apply it the way every FieldView migration is applied at release.
2. On the `api` service, set `COACH_TEXT_ENABLED` to `true`. For a first run with one account, also
   set `COACH_TEXT_OWNER_ALLOWLIST` to that owner account's id.
3. Confirm `RELAY_INBOUND_SECRET` is set on the same service.
4. Sign in as that owner. The dashboard shows the **Text commands** card.
5. Link a phone and check that the page turns to Linked and the email arrives.

Before the first real coach uses it:

- **Approve the consent wording.** The sentence under the form comes from
  `buildOwnerCommandsConsentPlain` in `packages/data-model/src/sms/compliance.ts`. The reply to a
  linked phone is in `apps/api/src/modules/coach-text/reply/replies.ts`.
- **Update the toll-free registration.** The approved program describes viewer alerts. Owner
  commands are a new use. Add them to the registration's use case and sample messages.

## Turning it off

**For everyone:** remove `COACH_TEXT_ENABLED` from the `api` service, or set it to `false`.

**For one account:** take its id off `COACH_TEXT_OWNER_ALLOWLIST`.

> **Do not empty the allowlist to shut out the last account.** An empty list means every owner
> account. To shut out the last account, turn the switch off.

What off means:

- Every text goes to keyword routing, exactly as before the feature existed.
- `GET /api/owners/me/text-commands` answers `enabled: false`. The dashboard card is hidden and the
  page says "Text commands are not turned on for this account yet."
- Asking for a code, changing the time zone and reading history answer 403.
- `DELETE /api/owners/me/text-commands/link` still works, so a linked phone can always be removed.

What off does not do:

- **It deletes nothing.** Links stay in `CoachTextLink` and work again when the switch comes back.
- **It does not record a STOP on the link.** While the switch is off, a STOP still opts the phone
  out of viewer texts, and the carrier still blocks replies to it. The link itself is not marked
  paused, so it shows as Linked when the switch comes back. Ask the owner to unlink it or to text
  START.

**To remove one phone:** the owner presses Unlink on the page. There is no admin screen for it in
this release.

## Seeing what happened

- **In the portal:** the page lists the recent texts tied to the login. The API is
  `GET /api/owners/me/text-commands/history`.
- **In the table `CoachTextCommand`:** one row for every verified LINK text, stored as
  `LINK ******`, with what came of it. A text that could not be verified is noted only when it
  comes from a phone that is linked or waiting for a code. The note has no body and no login, and
  there are at most five per phone per hour. The table is never pruned and has no foreign keys, so
  a deleted login does not erase the record.
- **In the API log.** Phones are masked. The messages are:
  - `Coach text link code made`
  - `Coach text phone linked`
  - `Coach text link removed`
  - `Coach text link paused by STOP`
  - `Coach text link resumed by START`
  - `Coach text handling failed; the text goes to the viewer path`

## When it does not work

| What the owner sees                                                     | Cause                                                                                                                                                         | Fix                                                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| On the page: "A text arrived but could not be verified. Send it again." | The relay did not mark the text as signed by Twilio, or the text came without a message id.                                                                   | If it repeats, fix the relay's Twilio signature setup. Do not loosen the check here. |
| The reply "Game not found. Please check your keyword and try again."    | The text was not treated as an owner text, so it went to keyword routing. The switch is off, `RELAY_INBOUND_SECRET` is missing, or the text was not verified. | Check the two settings, then the relay.                                              |
| The reply "That code did not match or has expired."                     | Wrong code, a code older than ten minutes, five wrong tries, or a text from a phone other than the one typed.                                                 | Ask for a new code.                                                                  |
| On the page: "Too many link attempts, please try again later."          | Five codes for the account in 15 minutes.                                                                                                                     | Wait 15 minutes.                                                                     |
| No reply at all, and the page stays on Waiting.                         | The text did not reach FieldView.                                                                                                                             | Look for the text in the SMS provider's log, then in the relay.                      |
| No reply, and the page turns to Paused.                                 | The phone texted STOP at some earlier time.                                                                                                                   | Text START from that phone.                                                          |
| Expired.                                                                | No text from the phone for `COACH_TEXT_LINK_IDLE_DAYS` days.                                                                                                  | Link it again.                                                                       |

## Testing with a real text

- **Every real text to the FieldView number reaches production.** There is no test route for
  inbound texts.
- **A number cannot text itself.** Send from a second number and read both sides in the SMS
  provider's log.
- **Use the allowlist.** Keep `COACH_TEXT_OWNER_ALLOWLIST` on your own account until the check
  passes.
- **Not proven by a text from a provider number:** the tap-to-text link on a real phone, and
  delivery on a real carrier.

## Not in this release

- Commands that read or change a stream.
- Creating a game page by text.
- Unlinking by text.
- Reading free text with a language model.
