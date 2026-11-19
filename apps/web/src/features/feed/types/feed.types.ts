export interface GetFeedParams {
  pageSize: number;
}

export interface FeedScrollState {
  counted: Set<string>;
  round: number;
}

export interface FeedTierStyle {
  light: string;
  dark: string;
  glow?: boolean;
}
