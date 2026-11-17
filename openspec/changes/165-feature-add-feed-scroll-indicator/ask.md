I want to let the user know how much did they scroll in the current session
It should be a text in format `<number_of_seen_notes>/<total_number_of_notes>`, like `10/300`
The "seen" number should change on scroll by number of the fetched posts, `10/300` -> `15/300` -> `20/300` and so on, BUT ideally it would change in real-time depending on the viewport -- new element in the viewport adds to the current counter
The "seen" number should not live between reload sessions -- it's client only and we reset it on page reload
I want this scroll indicator to be visible on both mobile and desktop, so probably I'd put it to the sticky header, but I'd like to jam with Claude Design on this
If the user scrolls throught every their note, we can reset the counter and show an indicator they're on the second round of scrolling, but it's not likely to happen though
