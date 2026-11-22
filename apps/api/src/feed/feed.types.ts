export interface GetFeedServiceDto {
  userId: string;
  pageSize: number;
  /** The visit's start: notes seen at or after it are skipped */
  since?: Date;
}
