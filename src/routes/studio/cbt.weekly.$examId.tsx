import { createFileRoute } from "@tanstack/react-router";
import { JambExamHall } from "@/components/JambExamHall";

export const Route = createFileRoute("/studio/cbt/weekly/$examId")({
  component: WeeklyCbtExamRoomPage,
});

function WeeklyCbtExamRoomPage() {
  const { examId } = Route.useParams();

  return (
    <JambExamHall
      examId={examId}
      examType="weekly_jamb"
      backRoute="/studio/cbt"
    />
  );
}
