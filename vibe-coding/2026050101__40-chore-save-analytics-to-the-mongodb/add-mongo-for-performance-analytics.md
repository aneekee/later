---
title: Add Mongo for Performance Analytics
created_at: 2026-05-01
created_by: Aliaksandr Kavalenka
---

## Overview

I want to know how much time does it take for each controller to execute; I also want to track the history, so I can see the changes and trends
I def can just write it to the existing postgres database, but I want to give Mongo a try + I'm interested in how Railway manages two

## To Do

- Add a local mongodb service in the docker-compose.yaml
  - Configure it the way the Nest.js can write events there
- Add a Nest.js module for performance analytics and add a service for writing data
  - Don't add indexes for now, keep it a simple collection
- Make the PerformanceInterceptor write the performance data to the mongodb with the service created above

The performance event schema in the mongodb should contain at least the following data

```typescript
interface PerformanceEvent {
  // For now it should only contain data in format like "GET /api/v1/chats",
  // but I also expect it to take the function/method names with the arguments
  target: string;

  // For the controller or function params;
  // only URL params like "?page=1&pageSize=20" or function args (not now, in future), no need to log request bodies
  params: string;

  // It should be ready to accept fractional millisecods from `performance.now()` calls
  duration: number;

  // Timestamp when the event was created
  createdAt: Date;
}
```

I also expect to other collections in my mongodb, I don't expect it to be for the analytics only
