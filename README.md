# Wordsmart Learn

Build a clean, distraction-free, mobile-first EdTech web application called "Learn Word Smart" with full Supabase Authentication and PostgreSQL backend integration.
### 1. DESIGN SYSTEM & UI TONE (MINIMALIST STUDY AESTHETIC)
- **Visual Direction:** Sleek, modern, distraction-free dark/light study interface (inspired by Linear, Raycast, and Duolingo). Avoid heavy casino clutter, ornate borders, or floating background animations.
- **Color Palette:**
  - Dark Mode (Default): Canvas `#090A0F`, Surface Card `#12151E`, Elevated `#1A1E2B`, Subtle Border `rgba(255,255,255,0.08)`, Primary Accent `#E11D48` (Rose Crimson), Success `#10B981`, Warning `#F59E0B`, Text Primary `#F8FAFC`, Text Secondary `#94A3B8`.
  - Light Mode: Canvas `#F4F4F5`, Surface Card `#FFFFFF`, Elevated `#E4E4E7`, Text Primary `#09090B`.
- **Typography:**
  - Primary UI & English Definitions: `'Plus Jakarta Sans'`, sans-serif.
  - Main Flashcard English Word: `'Playfair Display'` or `'Plus Jakarta Sans'` ExtraBold (clean, high-legibility).
  - Bangla Meanings: `'Hind Siliguri'`, sans-serif (bold, high contrast).
  - Metrics & Card Numbers: `'JetBrains Mono'`, monospace.
- **Navigation Layout:**
  - Desktop (`> 1024px`): Clean left sidebar (`240px`) with 3 main tabs (`Study Deck`, `Quiz Arena`, `Word Vault`) + top minimal utility header.
  - Mobile (`<= 1024px`): Fixed bottom navigation bar (`height: 60px`) with the 3 main tabs so the study card fits entirely on screen without vertical scrolling.
### 2. DOCKED CAT COMPANION ("JIJI" STATUS BAR)
- Do NOT place the mascot in the sidebar or at the top of the webpage where it scrolls out of view.
- Instead, render a compact **Docked Companion Bar (`height: 52px`) directly attached to the top edge of the active Flashcard and active Quiz Card**.
- It contains a `42px` animated SVG black cat avatar on the left, a status badge (`IDLE`, `HONESTY CHECK`, `STUDY MODE`, `CORRECT!`, `MISSED!`), and a 1-line reactive message.Because it is attached to the card container, the user always sees Jiji's face react while answering on both mobile and desktop.
### 3. SUPABASE DATABASE SCHEMA & RLS SECURITY
Create the following tables and Row-Level Security (RLS) policies:
1. `words_vault`:
   - `master_id` (int, primary key)
   - `word` (text, unique, uppercase)
   - `pos` (text)
   - `meaning_bn` (text)
   - `meaning_en` (text)
   - `syn` (text)
   - `ant` (text)
   - `sentence` (text)
   - `is_free_trial` (boolean, default false — true for the first 20 diagnostic words)
2. `profiles`:
   - `id` (uuid, primary key, references `auth.users`)
   - `email` (text)
   - `is_admin` (boolean, default false)
   - `subscription_status` (text: `'free_trial'`, `'active'`, `'expired'`)
   - `subscription_expires_at` (timestamptz)
   - `target_exam_date` (date, default `'2026-11-30'`)
   - `device_1_id` (text), `device_1_name` (text)
   - `device_2_id` (text), `device_2_name` (text)
   - `last_device_reset_at` (timestamptz)
   - `word_history` (jsonb, default `'{}'` — maps word to `{ status: 'learned' | 'weak', updatedDate: 'YYYY-MM-DD' }`)
   - `daily_log` (jsonb, default `'{}'` — maps `'YYYY-MM-DD'` to integer count of cards studied)
   - `last_master_id` (int, default 1)
3. `payment_requests`:
   - `id` (uuid, primary key)
   - `user_id` (uuid, references `profiles.id`)
   - `email` (text)
   - `plan_months` (int: 1, 2, 3, or 4)
   - `amount_bdt` (int: 99, 180, 250, or 320)
   - `wallet` (text: `'bKash'` or `'Nagad'`)
   - `sender_phone` (text)
   - `trx_id` (text, unique)
   - `status` (text: `'pending'`, `'approved'`, `'rejected'`)
   - `created_at` (timestamptz, default now())
- **RLS Policy on `words_vault`:** Users can only `SELECT` rows where `is_free_trial = true`, UNLESS their `profiles.subscription_status = 'active'` AND `profiles.subscription_expires_at > now()`.
### 4. CORE APPLICATION FEATURES & FLOWS
#### A. 2-Device Hardware Lock (Anti-Password Sharing)
- On login, generate/read a persistent `lws_device_id` UUID in `localStorage` along with browser/OS name.
- Check against the user's `profiles` row:
  - If `device_1_id` or `device_2_id` matches, allow access.
  - If an empty slot exists, save the device ID to that slot and allow access.
  - If both slots are filled by different IDs, block access to the workspace and show a **Device Limit Modal** listing the 2 active devices. Allow a self-service "Reset Devices" button only if `last_device_reset_at` is null or older than 30 days.
#### B. RANDOM 20-Card Free Diagnostic Assessment & Paywall Modal
- New users (`free_trial`) are dealt the 20 `is_free_trial` cards. Show a progress banner: `"Free Assessment Hand: Card X of 20"`.
- When the user finishes Card #20, or clicks any locked A–Z letter (`B–Z`), open the **Assessment Report & Paywall Modal**:
  - Show their diagnostic score (`X / 20 Known`) and missed words.
  - Present 4 prepaid pass options: **1 Month (49 BDT)**, **2 Months (79 BDT)**, **3 Months (99 BDT - Best Value)**, 
  - Show instructions to Send Money via **bKash / Nagad/ROCKET/UPAY** to the admin number 01558288319 with inputs for `Sender Phone Number` (11 digits) and `Transaction ID (TrxID)`. Submitting creates a row in `payment_requests` and shows a `"Verification Pending"` badge.
- **7-Day Expiry Warning:** If an active user's `subscription_expires_at` is within 7 days of `now()`, display a dismissible top warning bar with an `"Extend Pass"` button.
#### C. Tab 1: The Study Deck (Toned-Down 3D Card Engine)
- **Compact Metrics Bar:** 3 clean, minimal stat pills above the card:
  1. `Daily Target: X / Y cards` (dynamically calculated from remaining unlearned words divided by days left until `target_exam_date`).
  2. `Cleared: X (Y%)`
  3. `Practice Pile: X`
- **Filter Bar:** Horizontal A–Z letter selector (`ALL`, `A–Z`), status dropdown (`All`, `Unlearned`, `Practice Pile`, `Cleared`), Jump to Card `#` input, and `⚡ First Unlearned` button.
- **The 3D Study Card (with Docked Jiji Bar on top):**
  - **Front Face:** Card `#`, Part of Speech badge, Status tag, large centered Word, and 2 action buttons:
    - `Known (Test Me)`: Flips card to **Back Face Mode A (Honesty Check)** — a 4-option MCQ of English meanings. Picking the right option triggers a subtle confetti burst, sets Jiji to `CORRECT!`, marks the word as `'learned'`, syncs to Supabase, and reveals the full definition. Picking the wrong option sets Jiji to `MISSED!`, marks the word as `'weak'` (Practice Pile), and reveals the full definition.
    - `Unknown (Show Meaning)`: Marks word as `'weak'`, sets Jiji to `STUDY MODE`, and flips directly to **Back Face Mode B (Definition View)** showing Bangla meaning (`Hind Siliguri`), English definition, Synonyms, Antonyms, Example Sentence, and Web Speech API pronunciation button (`🔊`).
  - Support keyboard arrows (`Left`/`Right`) on desktop and touch swipe (`Left`/`Right`) on mobile to deal Next/Previous cards.
#### D. Tab 2: Automated 5-Mode Exam Quiz Arena
- Users select target letters (`A–Z`), pool (`All`, `Practice Pile`, `Cleared`), length (`10, 20, 30, 50`), and **Question Format**:
  1. `Definition Match` (Word -> 4 English definitions)
  2. `Fill in the Blank` (Automatically replaces the target word stem inside `sentence` with `_______` and offers 4 words of the same `pos`)
  3. `Closest Synonym` (Uses comma-separated `syn` field)
  4. `Opposite / Antonym` (Uses `ant` field, mixing in a synonym as a trap distractor)
  5. `Bangla to English` (Shows `meaning_bn` prompt -> 4 English words)
  6. `Mixed Exam Hand` (Randomly mixes all 5 formats)
- Display the Docked Jiji Bar above the quiz card so he reacts to every answer, followed by an instant explanation card after each selection.
#### E. Tab 3: Merged Word Vault & Revision Piles
- Combine the Word Database and Learning History into one clean, searchable tab with quick filter pills: `All Words`, `Practice Pile (Weak)`, and `Cleared Pile (Learned)`, plus a `"Quiz This Pile"` button and paginated list rows.
#### F. Admin Control Panel (`/admin` or Admin Modal for `is_admin = true`)
- **Payments Queue:** Table of pending `payment_requests` with 1-click **Approve** (automatically sets `subscription_status = 'active'` and adds `plan_months` to `subscription_expires_at`) and **Reject** buttons.
- **User Manager:** Search user by email to manually extend subscription or clear `device_1_id` / `device_2_id`.
- **Database Uploader:** A JSON/CSV paste box so the admin can paste the `wordsData` array from `words.js` and bulk-upsert all words into `words_vault`, with a checkbox to mark the first 20 words as `is_free_trial = true`.passes: **1 Month (49 BDT)**, **2 Months (79 BDT)**, **3 Months (99 BDT)**.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://wordsmart-learn.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c6a81326-c55c-4e8e-8608-104b01e552dd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
