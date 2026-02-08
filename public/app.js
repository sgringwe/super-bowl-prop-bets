const QUESTIONS = [
  {
    key: "question_1",
    text: "Time for National Anthem: 119.5 seconds",
    options: ["Over", "Under"],
  },
  {
    key: "question_2",
    text: "Outcome of the coin toss",
    options: ["Heads", "Tails"],
  },
  {
    key: "question_3",
    text: "Team to score 1st",
    options: ["Seahawks", "Patriots"],
  },
  {
    key: "question_4",
    text: "1st scoring play",
    options: ["Touchdown", "FG / Safety"],
  },
  {
    key: "question_5",
    text: "Either QB throws 300+ yards?",
    options: ["Yes", "No"],
  },
  {
    key: "question_6",
    text: "Touchdown of 1 or fewer yards?",
    options: ["Yes", "No"],
  },
  {
    key: "question_7",
    text: "Team to score last",
    options: ["Seahawks", "Patriots"],
  },
  {
    key: "question_8",
    text: "Either team scores 28 or more points?",
    options: ["Yes", "No"],
  },
  {
    key: "question_9",
    text: "# of times broadcast shows Cardi B: 3.5 times",
    options: ["Over", "Under"],
  },
  {
    key: "question_10",
    text: "Total number of AI Lab advertisements for an AI product: 4.5",
    options: ["Over", "Under"],
  },
  {
    key: "question_11",
    text: "First TV advertisement (after kickoff)?",
    options: ["Food / drink", "Not food / drink"],
  },
  {
    key: "question_12",
    text: "Kenneth Walker III rushing yards: 80.5",
    options: ["Over", "Under"],
  },
  {
    key: "question_13",
    text: "First letter of first bad Bunny song name?",
    options: ["a-m", "n-z"],
  },
  {
    key: "question_14",
    text: "Total half time show songs: 11.5",
    options: ["Over", "Under"],
  },
  {
    key: "question_15",
    text: "More total points in the first half or second half?",
    options: ["First", "Second"],
  },
  {
    key: "question_16",
    text: "Cardi B joins the half time show?",
    options: ["Yes", "No"],
  },
  {
    key: "question_17",
    text: "Gatorade shower color?",
    options: ["Orange / Lime", "Other"],
  },
  {
    key: "question_18",
    text: "Super Bowl winner?",
    options: ["Seahawks", "Patriots"],
  },
  {
    key: "question_19",
    text: "Super Bowl MVP",
    options: ["Quarterback", "Non-QB"],
  },
];
const QUESTIONS_COUNT = QUESTIONS.length;
const QUESTION_KEYS = QUESTIONS.map((question) => question.key);
const TIEBREAKER_LABEL = "Tiebreaker (enter a number) - total rushing yards:";

function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "className") {
      element.className = value;
    } else if (key === "text") {
      element.textContent = value;
    } else if (value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  });
  children.forEach((child) => element.appendChild(child));
  return element;
}

function buildQuestionField(question, selectedValue) {
  const fieldset = createElement("fieldset");
  const legend = createElement("legend", { text: question.text });
  fieldset.appendChild(legend);

  question.options.forEach((option, index) => {
    const id = `${question.key}-${index}`;
    const input = createElement("input", {
      type: "radio",
      name: question.key,
      id,
      value: String(index),
    });
    if (selectedValue !== null && selectedValue !== undefined && Number(selectedValue) === index) {
      input.checked = true;
    }
    const label = createElement("label", { for: id, text: option });
    const wrapper = createElement("div", { className: "row" }, [input, label]);
    fieldset.appendChild(wrapper);
  });

  return fieldset;
}

function buildTiebreakerField(value) {
  const wrapper = createElement("div", { className: "row" });
  const label = createElement("label", { for: "tiebreaker", text: TIEBREAKER_LABEL });
  const input = createElement("input", {
    type: "number",
    id: "tiebreaker",
    name: "tiebreaker",
    step: "0.5",
    value: value ?? "",
  });
  wrapper.appendChild(label);
  wrapper.appendChild(createElement("div", {}, [input]));
  return wrapper;
}

function buildForm({ includeName, initialAnswers, initialTiebreaker, submitLabel }) {
  const form = createElement("form");

  if (includeName) {
    const nameWrapper = createElement("div", { className: "row" });
    const label = createElement("label", { for: "name", text: "Your name" });
    const input = createElement("input", {
      type: "text",
      id: "name",
      name: "name",
      required: "required",
      autocomplete: "name",
    });
    nameWrapper.appendChild(label);
    nameWrapper.appendChild(createElement("div", {}, [input]));
    form.appendChild(nameWrapper);
  }

  QUESTIONS.forEach((question) => {
    form.appendChild(buildQuestionField(question, initialAnswers?.[question.key]));
  });

  form.appendChild(buildTiebreakerField(initialTiebreaker));

  const submitButton = createElement("button", { type: "submit", text: submitLabel });
  form.appendChild(submitButton);

  const message = createElement("div", { className: "row" });
  form.appendChild(message);

  return { form, message };
}

function collectAnswers(formData) {
  const answers = {};
  for (const key of QUESTION_KEYS) {
    const value = formData.get(key);
    if (!value) {
      return { error: `Please answer ${key.replace("_", " ")}.` };
    }
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || (numericValue !== 0 && numericValue !== 1)) {
      return { error: `Please answer ${key.replace("_", " ")}.` };
    }
    answers[key] = numericValue;
  }
  return { value: answers };
}

function collectPartialAnswers(formData) {
  const answers = {};
  let hasAny = false;
  for (const key of QUESTION_KEYS) {
    const value = formData.get(key);
    if (value === null || value === "") {
      continue;
    }
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || (numericValue !== 0 && numericValue !== 1)) {
      return { error: `Please answer ${key.replace("_", " ")}.` };
    }
    answers[key] = numericValue;
    hasAny = true;
  }
  return { value: answers, hasAny };
}

async function initIndex() {
  const root = document.getElementById("form-root");
  if (!root) return;

  const { form, message } = buildForm({
    includeName: true,
    initialAnswers: null,
    initialTiebreaker: "",
    submitLabel: "Submit Answers",
  });
  root.appendChild(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    message.className = "row";

    const formData = new FormData(form);
    const name = formData.get("name");
    if (!name || !name.trim()) {
      message.textContent = "Please enter your name.";
      message.classList.add("error");
      return;
    }

    const answers = collectAnswers(formData);
    if (answers.error) {
      message.textContent = answers.error;
      message.classList.add("error");
      return;
    }

    const tiebreaker = formData.get("tiebreaker");
    if (!tiebreaker) {
      message.textContent = "Please enter a tiebreaker number.";
      message.classList.add("error");
      return;
    }

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          answers: answers.value,
          tiebreaker,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Submission failed.");
      }
      window.location.href = "/scores.html";
    } catch (error) {
      message.textContent = error.message;
      message.classList.add("error");
    }
  });
}

function buildStatusText(status, masterValue) {
  if (status === "pending") {
    return "Pending";
  }
  if (status === "correct") {
    return "Correct";
  }
  if (status === "wrong") {
    return masterValue ? `Wrong (correct: ${masterValue})` : "Wrong";
  }
  return "Pending";
}

function getOptionLabel(question, value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  return question.options[Number(value)] ?? null;
}

function renderResponses(container, entry, master) {
  container.innerHTML = "";

  if (!entry) {
    container.appendChild(createElement("p", { className: "error", text: "Entry not found." }));
    return;
  }

  const list = createElement("ul");
  QUESTIONS.forEach((question) => {
    const entryAnswer = entry.answers?.[question.key];
    const masterAnswer = master?.answers?.[question.key];
    const entryLabel = getOptionLabel(question, entryAnswer);
    const masterLabel = getOptionLabel(question, masterAnswer);

    let status = "pending";
    if (masterAnswer !== null && masterAnswer !== undefined) {
      status = Number(entryAnswer) === Number(masterAnswer) ? "correct" : "wrong";
    }

    const statusEl = createElement("span", {
      className: `status ${status}`,
      text: buildStatusText(status, masterLabel),
    });

    const text = `${question.text}: ${entryLabel || "No answer"}`;
    const li = createElement("li", {}, [
      createElement("span", { text }),
      statusEl,
    ]);
    list.appendChild(li);
  });

  const tiebreakerEntry = entry.tiebreaker;
  const tiebreakerMaster = master?.tiebreaker;
  let tiebreakerStatus = "pending";
  let tiebreakerNote = "";
  if (tiebreakerMaster !== null && tiebreakerMaster !== undefined) {
    tiebreakerStatus =
      Number(tiebreakerEntry) === Number(tiebreakerMaster) ? "correct" : "wrong";
    tiebreakerNote = ` (actual: ${tiebreakerMaster})`;
  }

  const tiebreakerStatusEl = createElement("span", {
    className: `status ${tiebreakerStatus}`,
    text: buildStatusText(tiebreakerStatus, null),
  });

  const tiebreakerLi = createElement("li", {}, [
    createElement("span", {
      text: `Tiebreaker: ${tiebreakerEntry}${tiebreakerNote}`,
    }),
    tiebreakerStatusEl,
  ]);
  list.appendChild(tiebreakerLi);

  container.appendChild(list);
}

function computeEntryScore(entry, master) {
  if (!entry || !master?.answers) {
    return null;
  }
  let score = 0;
  QUESTIONS.forEach((question) => {
    const entryAnswer = entry.answers?.[question.key];
    const masterAnswer = master.answers?.[question.key];
    if (
      entryAnswer !== null &&
      entryAnswer !== undefined &&
      masterAnswer !== null &&
      masterAnswer !== undefined &&
      Number(entryAnswer) === Number(masterAnswer)
    ) {
      score += 1;
    }
  });
  return score;
}

function renderScores(container, entries, master) {
  container.innerHTML = "";

  if (!entries || entries.length === 0) {
    container.appendChild(createElement("p", { className: "note", text: "No entries yet." }));
    return;
  }

  if (!master) {
    container.appendChild(
      createElement("p", {
        className: "note",
        text: "Master sheet not set yet. Scores will appear once it is.",
      })
    );
  }

  const scores = entries.map((entry) => ({
    entry,
    score: computeEntryScore(entry, master),
  }));

  if (master) {
    scores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.entry.name.localeCompare(b.entry.name);
    });
  }

  const table = createElement("table");
  const thead = createElement("thead");
  const headerRow = createElement("tr");
  headerRow.appendChild(createElement("th", { text: "Name" }));
  headerRow.appendChild(createElement("th", { text: "Score" }));
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = createElement("tbody");
  scores.forEach(({ entry, score }) => {
    const row = createElement("tr");
    const responseHref = `/response.html?entry_id=${encodeURIComponent(entry.entry_id)}`;
    const nameLink = createElement("a", { href: responseHref, text: entry.name });
    row.appendChild(createElement("td", {}, [nameLink]));
    const scoreText = master ? `${score}/${QUESTIONS.length}` : "Pending";
    const scoreLink = createElement("a", { href: responseHref, text: scoreText });
    row.appendChild(createElement("td", {}, [scoreLink]));
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  container.appendChild(table);
}

async function initResponse() {
  const root = document.getElementById("response-root");
  const nameEl = document.getElementById("entry-name");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const entryId = params.get("entry_id");
  if (!entryId) {
    root.textContent = "Missing entry id.";
    root.className = "error";
    return;
  }

  async function loadScore() {
    try {
      const response = await fetch(`/api/score/${encodeURIComponent(entryId)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load entry.");
      }
      if (nameEl && data.entry) {
        nameEl.textContent = `Name: ${data.entry.name}`;
      }
      renderResponses(root, data.entry, data.master);
    } catch (error) {
      root.innerHTML = "";
      root.appendChild(createElement("p", { className: "error", text: error.message }));
    }
  }

  await loadScore();
  setInterval(loadScore, 5000);
}

async function initScores() {
  const root = document.getElementById("scores-root");
  if (!root) return;

  async function loadScores() {
    try {
      const response = await fetch("/api/scores");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load scores.");
      }
      renderScores(root, data.entries, data.master);
    } catch (error) {
      root.innerHTML = "";
      root.appendChild(createElement("p", { className: "error", text: error.message }));
    }
  }

  await loadScores();
  setInterval(loadScores, 60000);
}

async function initAdmin() {
  const root = document.getElementById("admin-root");
  if (!root) return;

  let initialAnswers = null;
  let initialTiebreaker = "";

  try {
    const response = await fetch("/api/admin/master");
    const data = await response.json();
    if (response.ok && data.master) {
      initialAnswers = data.master.answers;
      initialTiebreaker = data.master.tiebreaker ?? "";
    }
  } catch (error) {
    initialAnswers = null;
  }

  const { form, message } = buildForm({
    includeName: false,
    initialAnswers,
    initialTiebreaker,
    submitLabel: "Save Master Sheet",
  });
  root.appendChild(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    message.className = "row";

    const formData = new FormData(form);
    const answers = collectPartialAnswers(formData);
    if (answers.error) {
      message.textContent = answers.error;
      message.classList.add("error");
      return;
    }

    const tiebreaker = formData.get("tiebreaker");
    const hasTiebreaker = tiebreaker !== null && tiebreaker !== "";
    if (!answers.hasAny && !hasTiebreaker) {
      message.textContent = "Please select at least one answer or enter the tiebreaker.";
      message.classList.add("error");
      return;
    }

    try {
      const response = await fetch("/api/admin/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answers.hasAny ? answers.value : undefined,
          tiebreaker: hasTiebreaker ? tiebreaker : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save.");
      }
      message.textContent = "Master sheet saved.";
      message.classList.add("success");
    } catch (error) {
      message.textContent = error.message;
      message.classList.add("error");
    }
  });
}

const page = document.body?.dataset?.page;
if (page === "index") {
  initIndex();
} else if (page === "response") {
  initResponse();
} else if (page === "admin") {
  initAdmin();
} else if (page === "scores") {
  initScores();
}
