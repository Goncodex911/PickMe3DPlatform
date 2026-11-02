# Settings, Follow Creator, Activity Feed and payment receipts

Based on main `3cd8798`, pulled into `Tien/feat/unified-navigation` with no local changes.

## Implemented flows

- Settings sidebar destinations work. Projects links to `/profile/#designs`.
- `/settings/#ai`: separate keys for OpenAI, Gemini, Claude and existing DeepSeek; editable model ID, masked key, save/delete/test connection. Save before switching providers; the last saved provider is the Canvas default. Tests use Express `/api/ai/test` so static frontend hosting is supported.
- AI settings live in browser localStorage, scoped by account ID and provider. They are not encrypted or synchronized across devices. Legacy browser-wide credentials are not automatically assigned to an account; enter them again. Canvas listens for settings/account changes across tabs.
- `/settings/#security`: Google security management, current-browser sign-out, delete saved AI keys. Sign-out does not revoke other sessions.
- `/creator/?username=...` resolves newly registered creators on static hosting, where dynamic paths cannot be generated after deployment. Existing prebuilt profile routes remain supported.
- Creator profiles support idempotent follow/unfollow and follower count for signed-in users. Self-follow is rejected.
- `/activity/`: paginated public template publications from followed creators, newest first. Private content and banned/deleted creators are excluded. Likes/comments are not feed events.
- `/pricing/`: validate promo per paid plan, preview discount/total, then checkout. Backend recalculates totals and ignores client-supplied prices.
- `/settings/#billing`: latest 20 orders, status and receipt links.
- `/payment/receipt/?orderCode=...`: only the owner of a paid order can view. **In / Lưu PDF** opens the browser print dialog; choose Save as PDF. New orders retain customer and price/discount snapshots; old orders remain readable.

## Configuration and deployment

Existing MongoDB/auth/payOS configuration remains required. Follow/feed need a MongoDB-backed account; guest billing uses the existing fallback and guest identities are not persistent creator accounts.

Set deployment-managed promotions in backend `.env`:

```dotenv
PROMO_CODES_JSON=[{"code":"WELCOME10","type":"percent","value":10,"plans":["pro","studio"],"expiresAt":"2027-01-01T00:00:00Z"}]
```

Types: `percent` or `fixed` (VND). Optional fields: `plans`, `expiresAt`, `active`. Configure uppercase codes; input is normalized. No codes enabled by default. Discounts must leave a positive amount. No global/per-user usage limits. Keep configuration on the backend.

Mongoose declares a new Follow collection with unique follower/creator index and a Template feed index. If automatic index creation is disabled, provision them through the normal deployment process. No order data migration required.

The receipt confirms payment and is not a tax invoice. Legally issued electronic tax invoices require seller registration/tax details and an invoice-provider integration, neither configured in this repository.

## New authenticated API routes

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/users/:id/follow` | Following state and follower count |
| PUT / DELETE | `/api/users/:id/follow` | Follow / unfollow |
| GET | `/api/users/activity?page=1` | 20 public template events and `hasMore` |
| POST | `/api/payments/quote` | Server quote for `{ planId, months, promoCode }` |
| GET | `/api/payments/orders/:orderCode/receipt` | Paid, owned receipt; private/no-store |

Checkout additionally accepts `promoCode`, stores subtotal/discount/code/customer.

## Verification

- Production `npm run build` passed (including slide-editor and static export).
- Frontend typecheck passed; 791 frontend tests passed.
- Backend: 13 tests passed, covering promo constraints, server price calculation, receipt ownership/payment state, self-follow/idempotent writes and public/paginated feed query construction.
- Receipt ownership test was mutation-checked: reversing the authorization comparison caused the test to fail, then source was restored.
- HTTP smoke test with MongoDB disabled and `PAYMENT_MOCK=true`: 10 checks passed (anonymous access rejected; invalid promo; server amount; unpaid receipt; mock confirmation; paid receipt; other customer denied; order history). No real payment.
- AI/Security settings navigation and form labels inspected in a mobile browser viewport.

Before deployment: test two real MongoDB users following/unfollowing, feed visibility/pagination, real provider-key connection checks, payOS sandbox callbacks and receipt print preview/PDF. These external-service checks were not performed with production credentials.
