import { createFileRoute } from "@tanstack/react-router";
import { QuestionOcrWorkspace } from "@/components/question-ocr/QuestionOcrWorkspace";

export const Route = createFileRoute("/admin/importer")({ component: Importer });

function Importer() {
  return <QuestionOcrWorkspace />;
}

