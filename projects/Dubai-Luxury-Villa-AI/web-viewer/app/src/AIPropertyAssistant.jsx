import { useMemo, useState } from "react";
import roomData from "../data/rooms.json";

const rooms = roomData.rooms ?? [];

function normalise(value) {
  return value.trim().toLowerCase();
}

function answerQuestion(question) {
  const q = normalise(question);
  const room = rooms.find((item) => q.includes(normalise(item.name)));

  if (room) {
    return `${room.name}: ${room.area} m², floor ${room.floor}.`;
  }

  if (q.includes("largest") || q.includes("biggest")) {
    const largest = [...rooms].sort((a, b) => b.area - a.area)[0];
    return largest
      ? `The largest listed space is ${largest.name} at ${largest.area} m².`
      : "No room metadata is available yet.";
  }

  if (q.includes("total") || q.includes("area")) {
    const total = rooms.reduce((sum, item) => sum + item.area, 0);
    return `The currently listed room set totals ${total} m². This is prototype metadata, not construction documentation.`;
  }

  return "Ask about a room name, its area, floor, or the largest listed space.";
}

export default function AIPropertyAssistant() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]);

  const examples = useMemo(
    () => [
      "What is the area of the Master Bedroom?",
      "Which is the largest room?",
      "What is the total listed area?"
    ],
    []
  );

  function submit(value = question) {
    const text = value.trim();
    if (!text) return;

    setHistory((items) => [
      ...items,
      { role: "user", text },
      { role: "assistant", text: answerQuestion(text) }
    ]);
    setQuestion("");
  }

  return (
    <section aria-label="Property assistant">
      <h2>AI Property Assistant</h2>
      <p>Prototype answers are grounded only in local room metadata.</p>

      <div>
        {examples.map((example) => (
          <button key={example} type="button" onClick={() => submit(example)}>
            {example}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {history.map((item, index) => (
          <p key={`${item.role}-${index}`}>
            <strong>{item.role === "user" ? "You" : "Assistant"}:</strong>{" "}
            {item.text}
          </p>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about this villa..."
          aria-label="Ask about this villa"
        />
        <button type="submit">Ask</button>
      </form>
    </section>
  );
}
