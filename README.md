# 🍕 Pokket Pizza — Official Website

> **Handmade Pizza. Delivered Fresh.**
> A fast, mobile-first website for Pokket Pizza — featuring a full browse-to-order flow with WhatsApp order notifications.

---

## 📌 Project Overview

This is the official website for **Pokket Pizza**, a local pizza shop known for its handmade sourdough pizza base. The site allows customers to browse the menu, add items to a cart, and place orders (paid on delivery/pickup) — inspired by the Domino's ordering experience, scoped for a local business.

---

## ✨ Features

- 🛒 **Add to Cart** — per-item cart button, quantity stepper, running total
- 💾 **Persistent Cart** — LocalStorage-backed, survives page navigation
- 📲 **WhatsApp Order Notifications** — order details sent directly to shop via WhatsApp
- 📍 **Google Maps Embed** — shop location on Contact page
- 📞 **Click-to-Call & WhatsApp Chat** — floating buttons on every page
- ⭐ **Google Reviews** — social proof embed on Home & About pages
- 📱 **Mobile-First Responsive** — optimized for 18–30 age group on mobile

---

## 🧩 Day 4 Integration

Day 4 connects the customer and admin experiences to the Express API while keeping the frontend, backend, and database types aligned through the shared contract.

### Project layout

- `frontend/` — Next.js customer and admin UI, React Query data hooks, and the Zustand-backed cart.
- `backend/` — Express API with request IDs, security middleware, authentication, menu, and admin routes.
- `shared/contract/` — Shared TypeScript types and Zod schemas for API requests and responses.
- `prisma/` — PostgreSQL schema, migrations, and development seed data.
- `shared/design-tokens/` — Shared CSS custom properties for consistent frontend styling.

### Local development

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` and a development `JWT_SECRET`.
3. Copy `frontend/.env.example` to `frontend/.env.local`. The default API base is `http://localhost:4000/api/v1`.
4. Start both applications:

   ```bash
   npm run dev
   ```

   The customer UI runs at `http://localhost:3000` and the API runs at `http://localhost:4000`.

Set `NEXT_PUBLIC_USE_MOCKS=true` in `frontend/.env.local` to use the local MSW fixtures instead of the live API. Restart the frontend after changing environment variables.

### API surface

The health endpoints are available at `/health` and `/health/db`. Public menu data is available through `/api/v1/menu` and `/api/v1/products/:id`; authentication is available through `/api/v1/auth`; and protected admin endpoints are mounted under `/api/v1/admin`. Admin requests use the API's cookie-based session flow and must be sent with credentials enabled.

All API responses use the shared success/error envelope. When troubleshooting a failed request, use the returned `requestId` or the `x-request-id` response header to correlate the frontend and backend logs.

### Validation

Run the production build from the repository root with:

```bash
npm run build
```

The frontend and backend are built in sequence. See [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md) for component-specific setup notes.

---

## 🛒 Order Flow

```
Browse Menu → Add to Cart → Review Cart → Checkout Form → WhatsApp Order Sent → Pay on Delivery/Pickup
```

1. Customer browses Menu, taps **Add to Cart** on items
2. Cart icon shows item count + running total
3. Customer proceeds to **Checkout** (no login required)
4. Selects **Home Delivery** (free under 1.5 km) or **In-store Pickup**
5. Fills name, phone, address/note
6. On submit → order sent to shop via **WhatsApp message**
7. Payment collected **cash/UPI on delivery or pickup**

---

*© 2026 Pokket Pizza. Built with ❤️ by KLNBS.*
