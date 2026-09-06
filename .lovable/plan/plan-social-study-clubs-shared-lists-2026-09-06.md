# Plan: Social study clubs & shared lists

## Goal
Turn EduFlix from a solo recommendation tool into a community-driven learning platform where users can publish curated watchlists, follow other learners, and discover titles through shared collections.

## What we will build

### 1. Shared lists (collections)
- Any signed-in user can create a list with a title, description, subject tag, and public/private visibility.
- Lists contain movie/TV items (tmdbId, mediaType, title, poster, year, rating, note).
- Owners can edit metadata, reorder/remove items, and delete the list.
- Public lists are discoverable by everyone; private lists are owner-only.

### 2. Community hub
- New public route `/community` showing recently published public lists and a "most saved" leaderboard.
- Each list gets a public detail page at `/lists/$listId` with owner info, items, and a "Follow creator" CTA.
- Search/filter lists by subject.

### 3. Follows
- Signed-in users can follow/unfollow another user.
- A `/users/$userId` profile page shows that user's public lists, follower/following counts, and a follow button.
- A "Following" feed on `/community` surfaces new lists from followed users.

### 4. Save-to-list everywhere
- Add an "Add to list" action on title cards and the title detail page.
- Quick-popover lets users pick one of their lists or create a new one on the spot.

### 5. Data layer
- New Mongo collections: `lists`, `list_items`, `follows`.
- New server functions in `src/lib/social.functions.ts` for CRUD, follows, and discovery.
- Reuse existing `profiles` collection for display names.

## Routes & pages
- `/community` — public discovery hub
- `/lists` — authenticated user's own lists
- `/lists/$listId` — public or owner-only list detail
- `/users/$userId` — public profile with lists and follow button
- (Existing routes updated) title pages and title cards get "Add to list"

## UI additions
- Navbar link to **Community**.
- `ListCard` component for list previews.
- `AddToListButton` / `SaveToListPopover` components.
- `FollowButton` component.
- Simple empty states and loading skeletons matching the current design.

## Out of scope for this first pass
- Real-time comments/reviews on titles or lists.
- Likes/voting on individual lists (leaderboard uses save/follow counts instead).
- Direct messaging or group chat.

These can be added once the list/follow core is live and used.
