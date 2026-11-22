import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "./lib/session";
import { getRouter } from "./router";

const router = getRouter();

export default function App() {
  useEffect(() => {
    if (useSession.getState().status === "idle") {
      void useSession.getState().restore();
    }
  }, []);

  return <RouterProvider router={router} />;
}
