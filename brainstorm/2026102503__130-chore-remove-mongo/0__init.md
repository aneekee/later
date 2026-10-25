I want to remove the mongo db dependency from the app
Remove the mongo apps/api/src/mongo module and all the schemas
Change the BE so it writes the performance events apps/api/src/performance-analytics to the Postgres (create a prisma schema)
Delete mongo dependencies like mongoose from the BE app apps/api/package.json
Delete mongo dependency from the apps/api/docker-compose.yaml
