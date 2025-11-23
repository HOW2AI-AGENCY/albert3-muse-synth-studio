// import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
// import { handler as getTimestampedLyricsHandler } from "../get-timestamped-lyrics/index.ts";

// Deno.test("get-timestamped-lyrics handler", async () => {
//   const req = new Request("http://localhost:8000/", {
//     method: "POST",
//     body: JSON.stringify({
//       taskId: "test-task-id",
//       audioId: "test-audio-id",
//     }),
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": "Bearer fake-token",
//     },
//   });

//   const res = await getTimestampedLyricsHandler(req);
//   assertEquals(res.status, 200);
// });
