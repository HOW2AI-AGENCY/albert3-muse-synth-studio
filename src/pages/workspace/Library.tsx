import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TracksList } from "@/components/TracksList";

const Library = () => {
  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Библиотека треков</CardTitle>
        </CardHeader>
        <CardContent>
          <TracksList />
        </CardContent>
      </Card>
    </div>
  );
};

export default Library;
