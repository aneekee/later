import { NotesStatsContainer } from '../components/NotesStats/NotesStatsContainer';

export const DashboardPage = () => {
  return (
    <div className="h-full flex flex-col gap-8 p-5 overflow-y-auto">
      <NotesStatsContainer />
    </div>
  );
};
