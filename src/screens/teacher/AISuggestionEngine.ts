export type TierKey = "mastered" | "developing" | "support";

export type GroupInput = {
  studentNames: string[];
  scores: number[];
};

export type SuggestRequest = {
  subject: string;
  assessmentTitle?: string;
  groups: Record<TierKey, GroupInput>;
};

export type SuggestResult = Record<TierKey, string>;

function chapterOf(title = ""): string {
  const m = title.match(/Chapter\s*(\d+)/i);
  return m ? `Chapter ${m[1]}` : "this topic";
}
function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((s, n) => s + (n ?? 0), 0) / nums.length) * 10) / 10;
}
function bullet(items: string[]): string {
  return items.map((x) => `• ${x}`).join("\n");
}
function subjectKey(s: string): "math" | "science" | "general" {
  const t = s.toLowerCase();
  if (t.includes("math")) return "math";
  if (t.includes("science")) return "science";
  return "general";
}

function templateBank(subj: "math" | "science" | "general") {
  const bank = {
    general: {
      mastered: [
        "Choice board: pick 1—make a short video explainer, create 3 challenge questions with answers, or write a quick how-to guide.",
        "Peer coach: help a buddy from the Developing group for 10 minutes (use the worked example first).",
        "Exit ticket: 3 mixed problems to confirm understanding.",
      ],
      developing: [
        "Mini-lesson: model 2 worked examples, then do 5 guided questions (I do → We do → You do).",
        "Use hints/sentence starters; check after each 2 questions.",
        "Short quiz (5 items) tomorrow to check progress.",
      ],
      support: [
        "Re-teach in 3 small steps with visuals/manipulatives.",
        "Do 4 scaffolded problems (very small jumps).",
        "Parent note: 1 tip for practice at home (5 mins).",
      ],
    },
    math: {
      mastered: [
        "Create a real-life word problem for this skill and solve it.",
        "Teach-back: record a 60-sec demo showing two methods.",
      ],
      developing: [
        "Fluency: 5 practice problems with worked example on top.",
        "Error-fix: review 2 common mistakes and fix them.",
      ],
      support: [
        "Concrete → pictorial → abstract: use blocks/shapes first, then pictures, then numbers.",
        "Do 3 very small-step problems with number lines or grids.",
      ],
    },
    science: {
      mastered: [
        "Design a mini-investigation or demo showing the concept.",
        "Create a one-pager with a diagram and labels.",
      ],
      developing: [
        "Close-read a short text + diagram, then answer 4 guided questions.",
        "Do a table-fill activity (observe → record → explain).",
      ],
      support: [
        "Hands-on demo with teacher; fill a simple ‘observe → because’ frame.",
        "Match pictures to keywords, then 2 short questions.",
      ],
    },
  } as const;
  return bank[subj];
}

function makeText(params: {
  header: string;
  names: string[];
  avgScore: number;
  lines: string[];
}): string {
  const names = params.names.length ? ` (${params.names.join(", ")})` : "";
  const info = `Avg: ${params.avgScore}%`;
  return `${params.header}${names}\n${info}\n${bullet(params.lines)}`;
}

export function suggestActivitiesForGroups(req: SuggestRequest): SuggestResult {
  const subjKey = subjectKey(req.subject);
  const bank = templateBank(subjKey);
  const topic = chapterOf(req.assessmentTitle);

  const build = (tier: TierKey, label: string) => {
    const g = req.groups[tier];
    const gAvg = avg(g.scores);

    const lines: string[] = [];
    if (subjKey === "general") {
      lines.push(...bank[tier].slice(0, 3));
    } else {
      lines.push(...bank[tier].slice(0, 2));
      lines.push(templateBank("general")[tier][0]);
    }

    if (tier !== "mastered") {
      if (gAvg < 50) lines.push("Keep questions very short; check after each step.");
      else if (gAvg >= 70) lines.push("End with a 3-item exit ticket.");
    } else {
      if (gAvg >= 90) lines.push("Optional challenge: extend to next topic.");
    }

    return makeText({
      header: `${req.subject} — ${topic} — ${label}`,
      names: g.studentNames,
      avgScore: gAvg,
      lines,
    });
  };

  return {
    mastered: build("mastered", "Mastered group"),
    developing: build("developing", "Developing group"),
    support: build("support", "Needs Support group"),
  };
}
