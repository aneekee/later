export interface GetFeedParams {
  pageSize: number;
}

/** The size of the page to request and, after the first page, the visit's start */
export interface FeedPageParam {
  pageSize: number;
  since?: string;
}

export interface FeedTierStyle {
  light: string;
  dark: string;
  glow?: boolean;
}
