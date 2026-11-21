# Later

A feed-like notes app: a user saves notes and works through the stalest ones in a feed.

## Language

**User**:
A person with an account who owns notes.
_Avoid_: account, member

**Note**:
A short text a user saves to come back to later. Text is the only kind today.
_Avoid_: message, item, post

**Feed**:
A user's endless queue of their own notes, served stalest first, one page at a time.
_Avoid_: inbox, timeline, chat

**Seen**:
A note is seen once the feed has served it. A new note is created already seen, so it joins the end of the rotation.
_Avoid_: read, viewed, resolved

**Rotation**:
The order in which the feed cycles through notes: never-seen notes first, then the ones unseen for the longest, adjusted by tier.

**Scrolled**:
An estimate of how many notes the user has scrolled past in the current visit to the feed, read from the scroll position over the loaded notes, as opposed to Seen, which is about the server serving them. It lasts only for that visit and isn't stored.
_Avoid_: seen, viewed, read

**Round**:
One pass of a feed visit through all of the user's notes. A new round starts each time the Scrolled count passes the number of the user's notes.
_Avoid_: cycle, lap

**Tier**:
One of a fixed, ordered set of grades on a note: S, A, B, C, D, with S the highest. New notes are D; a higher tier brings the note back sooner in the rotation.
_Avoid_: rating, score, votes

**Dashboard**:
The page with a user's note totals.
_Avoid_: home, stats page

## Retired terms

Don't use these in code, specs or UI text.

- Removed in #157: Message, Chat, Inbox and Resolution no longer exist.
- Removed in #151: Rating (the numeric 0 to 10000 grade), Upvote and Downvote. A note has a Tier instead.
