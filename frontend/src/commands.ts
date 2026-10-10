/** Local UI intents only. This boundary can also accept future speech-to-text. */
export type WindowId =
  | "tasks"
  | "calendar"
  | "emails"
  | "messages"
  | "conversations"
  | "settings"
  | "agents"
  | "memory"
  | "tools"
  | "workflows"
  | "help";
export type UIIntent =
  | { action: "open" | "close" | "minimize"; window: WindowId }
  | { action: "close-all" };
const cyrillic: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ђ: "dj",
  е: "e",
  ж: "z",
  з: "z",
  и: "i",
  ј: "j",
  к: "k",
  л: "l",
  љ: "lj",
  м: "m",
  н: "n",
  њ: "nj",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  ћ: "c",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "c",
  џ: "dz",
  ш: "s",
};
function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[а-шђјљњћџ]/g, (letter) => cyrillic[letter] ?? letter)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj")
    .replace(/[,.!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const aliases: Record<WindowId, string[]> = {
  tasks: [
    "tasks",
    "task list",
    "task manager",
    "to do list",
    "zadatke",
    "zadaci",
    "listu zadataka",
    "lista zadataka",
    "spisak zadataka",
  ],
  calendar: ["calendar", "kalendar"],
  emails: [
    "email",
    "emails",
    "mail",
    "inbox",
    "email panel",
    "mejlove",
    "mejl",
    "emailove",
    "postu",
    "elektronsku postu",
  ],
  messages: ["messages", "recent messages", "poruke"],
  conversations: [
    "conversations",
    "conversation history",
    "chat",
    "chat history",
    "razgovore",
    "razgovori",
    "istoriju razgovora",
    "istoriju konverzacija",
  ],
  settings: [
    "settings",
    "system settings",
    "podesavanja",
    "podesavanja sistema",
    "postavke",
  ],
  agents: ["agents", "agente", "agenti"],
  memory: ["memory", "memoriju", "memorija"],
  tools: ["tools", "tools and skills", "alate", "alati"],
  workflows: ["workflows", "radne tokove", "radni tokovi"],
  help: ["help", "commands", "command help", "pomoc", "komande"],
};
export function parseUICommand(input: string): UIIntent | null {
  if (input.length > 2000) return null;
  const text = normalize(input)
    .replace(/^(?:hey )?(?:jarvis|jarvise|dzarvis|dzarvise)\s+/, "")
    .replace(/^(?:please|molim te)\s+/, "")
    .replace(/\s+(?:please|molim te)$/, "");
  if (
    /^(?:close (?:everything|all(?: windows)?)|zatvori sve(?: prozore)?|sakrij sve(?: prozore)?)$/.test(
      text,
    )
  )
    return { action: "close-all" };
  if (text === "help" || text === "pomoc")
    return { action: "open", window: "help" };
  const match = text.match(
    /^(open|show(?: me)?|display|bring up|pull up|restore|close|hide|dismiss|minimize|otvori|prikazi|pokazi(?: mi)?|vrati|zatvori|sakrij|minimizuj)\s+(?:(?:my|the|a|mi|moj|moje|moju)\s+){0,2}(.+)$/,
  );
  if (!match) return null;
  const action = /^(close|hide|dismiss|zatvori|sakrij)$/.test(match[1])
    ? "close"
    : /^(minimize|minimizuj)$/.test(match[1])
      ? "minimize"
      : "open";
  const module = Object.entries(aliases).find(([, names]) =>
    names.includes(match[2]),
  );
  return module ? { action, window: module[0] as WindowId } : null;
}
export const windowTitles: Record<WindowId, string> = {
  tasks: "Task manager",
  calendar: "Calendar",
  emails: "Emails",
  messages: "Messages",
  conversations: "Conversations",
  settings: "Settings",
  agents: "Agents",
  memory: "Memory",
  tools: "Tools & skills",
  workflows: "Workflows",
  help: "Command guide",
};
export const windowTitlesSr: Record<WindowId, string> = {
  tasks: "Zadaci",
  calendar: "Kalendar",
  emails: "Mejlovi",
  messages: "Poruke",
  conversations: "Razgovori",
  settings: "Podešavanja",
  agents: "Agenti",
  memory: "Memorija",
  tools: "Alati i veštine",
  workflows: "Radni tokovi",
  help: "Vodič za komande",
};
