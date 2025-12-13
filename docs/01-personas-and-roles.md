# Personas, Roles, and Permissions

## Personas
### Viewer (no account)
- **Primary job**: watch one specific game remotely.
- **Constraints**: may be non-technical (grandparents); mobile-first; should not need login.
- **Primary channels**: SMS + mobile browser.
- **Identity requirement**: Email address is required at checkout for monitoring and stream protection. Phone number is optional (used for SMS delivery).

### Camera Owner (Owner-only)
- **Primary job**: monetize games with minimal setup.
- **Needs**: game creation + keyword/QR generation; payouts; clear per-game performance; signage templates.
- **Monitoring**: can view who purchased and watched their games (audience list with masked emails by default).

### Association Admin (Association-only)
- **Primary job**: operate multiple fields/teams and manage staff access.
- **Needs**: multi-user, consolidated reporting, operational controls.

### Association Operator (Association-only; optional MVP)
- **Primary job**: field operations (start/stop stream, monitor status, basic troubleshooting).
- **Note**: can be **Post-MVP** if associations are small; included here for completeness.

### Internal Support Admin
- **Primary job**: troubleshoot purchases, links, and refunds; support owners/associations.
- **Needs**: strong audit logging, safe controls, fast search and timeline.

### Super Admin (Platform Owner)
- **Primary job**: global controls, risk management, system configuration.
- **Needs**: configure platform fee/refund thresholds (bounded), suspend accounts, audit review.
- **Monitoring**: can drill down by owner/customer to see all viewers, purchases, and playback sessions across the platform (full email visibility for support/compliance).

## Role definitions
- **Viewer**: anonymous user who purchases game access.
- **OwnerUser**: authenticated user managing an OwnerAccount.
- **AssociationAdmin**: OwnerUser with multi-user management + consolidated reporting.
- **AssociationOperator**: limited OwnerUser role for field ops.
- **SupportAdmin**: internal staff role.
- **SuperAdmin**: internal platform owner role.

## Permissions matrix (MVP)
Legend: ✅ allowed, ❌ not allowed, ⚠️ allowed with restrictions/policy

| Capability | Viewer | OwnerUser | AssociationAdmin | AssociationOperator | SupportAdmin | SuperAdmin |
|---|---:|---:|---:|---:|---:|---:|
| Request payment link by SMS keyword | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pay for a game | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Watch stream (with entitlement) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create/edit/cancel games | ❌ | ✅ | ✅ | ⚠️ (if delegated) | ⚠️ (support only) | ✅ |
| Set pricing per game | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Configure keyword/QR | ❌ | ✅ | ✅ | ⚠️ (view/copy only) | ⚠️ (disable only) | ✅ |
| View revenue analytics | ❌ | ✅ | ✅ | ⚠️ (limited) | ✅ (read-only) | ✅ |
| View audience (purchasers/watchers) | ❌ | ✅ | ✅ | ❌ | ✅ (read-only) | ✅ |
| View full viewer email (unmasked) | ❌ | ❌ | ❌ | ❌ | ⚠️ (support only) | ✅ |
| Issue manual refunds | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Override refund rules | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Resend payment/watch links to viewer | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Disable a keyword/game | ❌ | ✅ | ✅ | ⚠️ (if delegated) | ✅ | ✅ |
| Suspend owner account | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Configure platform fee / refund thresholds | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## Authentication requirements
### Viewer
- No account required.
- Entitlement required to watch.

### OwnerUser / AssociationAdmin / AssociationOperator
- Email/password.
- Password reset and account recovery.
- Optional step-up auth for payout-related changes.

### SupportAdmin / SuperAdmin (MVP)
- Email/password + **MFA (TOTP)** required.
- Session timeouts and step-up authentication for high-risk actions (refunds, disabling keywords, config changes).
- All actions are audit-logged.
