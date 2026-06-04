const fromDate = new Date();
fromDate.setDate(fromDate.getDate() - 30);

export const MESSAGE_BURNDOWN_FROM_DATE = fromDate.toISOString();
