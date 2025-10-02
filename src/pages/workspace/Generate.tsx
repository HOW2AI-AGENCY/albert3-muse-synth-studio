import { MusicGenerator } from "@/components/MusicGenerator";
import { TracksList } from "@/components/TracksList";
import { useState } from "react";

const Generate = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTrackGenerated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 md:p-6 h-[calc(100vh-4rem)]">
      {/* Create Panel */}
      <div className="w-full lg:w-80 shrink-0">
        <MusicGenerator onTrackGenerated={handleTrackGenerated} />
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-auto">
        <TracksList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};

export default Generate;
