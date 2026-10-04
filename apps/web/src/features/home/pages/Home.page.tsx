import { NotesBurndownContainer } from '../components/NotesBurndown/NotesBurndownContainer';
import { NotesStatsContainer } from '../components/NotesStats/NotesStatsContainer';

export const HomePage = () => {
  return (
    <div className="h-full flex flex-col gap-8 p-5 overflow-y-auto">
      <NotesStatsContainer />
      <NotesBurndownContainer />
    </div>
  );
};
