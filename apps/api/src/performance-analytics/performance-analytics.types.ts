export interface CreatePerformanceEventDto {
  target: string;
  params: Record<string, string>;
  duration: number;
}
