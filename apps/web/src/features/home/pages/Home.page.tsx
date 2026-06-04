import { MessageBurndownBarChartContainer } from '../components/MessageBurndown/MessageBurndownBarChartContainer';
import { MessageBurndownChartContainer } from '../components/MessageBurndown/MessageBurndownChartContainer';

export const HomePage = () => {
  return (
    <div className="p-5">
      <div className="mt-6 flex gap-5">
        <MessageBurndownChartContainer />
        <MessageBurndownBarChartContainer />
      </div>
    </div>
  );
};
