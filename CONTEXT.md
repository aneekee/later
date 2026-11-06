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
The order in which the feed cycles through notes: never-seen notes first, then the ones unseen for the longest, adjusted by rating.

**Rating**:
A whole number from 0 to 10000 on a note. Each point brings the note back one hour sooner in the rotation.
_Avoid_: score, likes, votes

**Upvote / Downvote**:
The feed actions that raise or lower a note's rating by one point.

**Dashboard**:
The page with a user's note totals.
_Avoid_: home, stats page

## Retired terms (removed in #157)

Message, Chat, Inbox and Resolution no longer exist. Don't use them in code, specs or UI text.
