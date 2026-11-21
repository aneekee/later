In the https://github.com/aneekee/later/pull/177 I've implemented notes scroll indicator
It costed me a new complex hook `useFeedScrollCounter` and a ref on each `FeedItem`
I don't like this extra complexity
I want to revert these changes here and implement similar behavior, but simpler

I want to start from making the progress bar less accurate -- it'll update the scroll progress not on new feed item in viewport, but on each page load: another page fetch means increment the `FeedScrollCounter` on another page size
For example, on the feed load the counter is 0/300
On another page load, its 10/300
On another page load, its 20/300 and so on

If this step works and I like the result, I want to go further: it'll update the scroll more gradually, so the progress increment step would be 1s, not 10s
I'm not sure if it's the correct way to do it, but I'd consider to measure the progress by the distance to the `FeedSentinel` from the current scroll position or something else
I'd be happy to discuss alternatives if this improvement doesn't work
