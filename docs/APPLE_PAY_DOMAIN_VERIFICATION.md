# Apple Pay Domain Verification

## Overview

Apple Pay on the web requires domain verification. Square handles this for you through their Web Payments SDK, but the domain must be registered and verified.

## Location

The verification file is located at:
```
apps/web/public/.well-known/apple-developer-merchantid-domain-association
```

This file is served at:
```
https://fieldview.live/.well-known/apple-developer-merchantid-domain-association
```

## How to Update the Verification File

1. **Log into Square Developer Dashboard**
   - Go to: https://developer.squareup.com/apps
   - Select your application (Production)

2. **Navigate to Apple Pay Settings**
   - Click on "Apple Pay" in the left sidebar
   - Under "Domain Verification", click "Add Domain"
   - Enter: `fieldview.live`

3. **Download the Verification File**
   - Square will provide a verification file to download
   - Replace the contents of `apps/web/public/.well-known/apple-developer-merchantid-domain-association` with this file

4. **Deploy and Verify**
   - Push changes to production
   - Wait for deployment to complete
   - In Square Dashboard, click "Verify" for the domain

## Verification Status

| Domain | Status | Notes |
|--------|--------|-------|
| `fieldview.live` | Pending | Needs verification file from Square Dashboard |

## Testing Apple Pay

Apple Pay requires:
- HTTPS domain (production or localhost with mkcert)
- Safari browser on macOS/iOS
- Apple Pay enabled in Wallet
- Registered domain in Square Dashboard

## Troubleshooting

### "Domain not verified" error
1. Ensure the file is accessible at `/.well-known/apple-developer-merchantid-domain-association`
2. File must be served with `Content-Type: text/plain` or no content type
3. No redirects or HTML wrapping
4. Check Square Dashboard for verification errors

### Testing locally
For local development, use Square's sandbox mode. Apple Pay verification is only needed for production.

## References

- [Square Apple Pay Integration](https://developer.squareup.com/docs/web-payments/apple-pay)
- [Apple Pay on the Web](https://developer.apple.com/documentation/apple_pay_on_the_web)
