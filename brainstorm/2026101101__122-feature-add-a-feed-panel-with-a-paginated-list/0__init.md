I want to add a new page similar to Feed in Twitter/Threads.
It should list all mine notes and I want to be able to scroll through them.
Scrolling should be permanent -- there is an ordered list of notes (which is looped), and I see each page once per iteartion: after I open the app again, I won't see the page I saw before, unless I scroll all the notes and get back to the original page.

I want to implement it the following way:

- I add a seen_at column to each note, null by default
- when I create a new note the seen_at column is null
- when I scroll the feed and get another page, I set current timestamp to the seen_at
- the feed order is defined by seen_at (and created_at for ties). I want to see the items I didn't see for long first; nulls are considered the oldest seen_at, so I want to see them first
- I expect to extend the feed order algorithm with new rules and variables
- notes in the feed should be card-like components with the content, metadata (created_at for now) and space for controls in future
- the feed should look good on both mobile and desktop -- make it look like a twitter with a feed in the middle of the screen

On FE the feed should be a separate feature and a separate page.
On BE it should be a separate module.
