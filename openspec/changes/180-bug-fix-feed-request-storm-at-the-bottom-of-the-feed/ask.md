I want to fix the issue defined in the https://github.com/aneekee/later/issues/180
The fix has to be simple: it should at least not introduce new complex code; ideally it should make code less complex
I think the issue happens in the end of the feed, when every note was already fetched
If it helps, I would like to simplify the feed fetching algorithm -- when there is already `total count` notes fetched, it should don't make any new requests; I'm fine with ignoring just created notes in this session if it helps
