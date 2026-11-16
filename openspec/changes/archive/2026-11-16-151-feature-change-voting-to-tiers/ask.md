There is a feed of notes in my app.
I order notes via rating I setup manually in the `apps/web/src/features/feed/components/FeedItem.tsx` Feed rating control.
The rating is the number and I can configure its value by how long the button is pressed.
Now I think it has a bad UX on both mobile and desktop, and I want to change it to something simpler.
I want to replace the numeric rating with the tier slider -- there should be a fixed set of rating tiers (S, A, B, C, D) and a slider control to pick a value for a note, instead of pressing the button.

The slider should look take fixed values, not to be an absolute slider; it should look like an old picked in the Claude Code used to pick the model effort.
I'd like to use the shadcn slider, but if it won't be usable we can build a custom tier picker.
I'd also love to jam with Claude Design first and get the design artefacts for the coding agent if possible.

The default rating for the new notes should be D.

The notes should be sorted by the rating, just like now, but the order should be S -> A -> B -> C -> D.

Keep in mind, that I may want to add some other ratings like F, and SSS, so please make sure the solution is extendable.

I'll do the data migration on prod by myself: first we just add the new rating field and make it optional, then on prod I'll manually set new ratings depending on the numeric values, then in a separate PR I'll drop the old numeric column and rename the new rating field to just `rating`.
We'll remove the old control in this iteration, of course.

One of tasks here is to get rid of the old ratings implementation: `apps/web/src/features/feed/components/FeedRating.tsx` and all related files
