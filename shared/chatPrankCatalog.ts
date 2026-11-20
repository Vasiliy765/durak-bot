export type ChatPrankActionDefinition = {
  readonly id: string;
  readonly title: string;
  readonly triggers: readonly string[];
  readonly leadingEmoji: string;
  readonly actionText: string;
  readonly endingEmoji: string;
};

export type ChatPrankCategory = {
  readonly id: string;
  readonly title: string;
  readonly actions: readonly ChatPrankActionDefinition[];
};

/** Canonical RP actions shared by the Telegram handler and Mini App guide. */
export const chatPrankCategories = [
  {
    id: "romantic",
    title: "Романтичні дії",
    actions: [
      {
        id: "поцілувати",
        title: "Поцілувати",
        triggers: ["поцілувати"],
        leadingEmoji: "💋",
        actionText: "ніжно поцілував(ла)",
        endingEmoji: "💋",
      },
      {
        id: "подарувати квіти",
        title: "Подарувати квіти",
        triggers: ["подарувати квіти"],
        leadingEmoji: "🌹",
        actionText: "подарував(ла) чудовий букет квітів",
        endingEmoji: "🌹",
      },
      {
        id: "обійняти",
        title: "Обійняти",
        triggers: ["обійняти"],
        leadingEmoji: "🫂",
        actionText: "міцно обійняв(ла)",
        endingEmoji: "🤗",
      },
    ],
  },
  {
    id: "friendly",
    title: "Дружні дії",
    actions: [
      {
        id: "потиснути руку",
        title: "Потиснути руку",
        triggers: ["потиснути руку"],
        leadingEmoji: "🤝",
        actionText: "міцно потиснув(ла) руку",
        endingEmoji: "🤝",
      },
      {
        id: "дати п'ять",
        title: "Дати п'ять",
        triggers: ["дати п'ять"],
        leadingEmoji: "🙌",
        actionText: "дав(ла) п'ять",
        endingEmoji: "🙌",
      },
      {
        id: "віддати честь",
        title: "Віддати честь",
        triggers: ["віддати честь"],
        leadingEmoji: "🫡",
        actionText: "віддав(ла) військове вітання",
        endingEmoji: "🫡",
      },
      {
        id: "пригостити кавою",
        title: "Пригостити кавою",
        triggers: ["пригостити кавою"],
        leadingEmoji: "☕",
        actionText: "пригостив(ла) ароматною кавою",
        endingEmoji: "☕",
      },
      {
        id: "почастувати піцою",
        title: "Почастувати піцою",
        triggers: ["почастувати піцою"],
        leadingEmoji: "🍕",
        actionText: "пригостив(ла) смачною піцою",
        endingEmoji: "🍕",
      },
      {
        id: "підбадьорити",
        title: "Підбадьорити",
        triggers: ["підбадьорити"],
        leadingEmoji: "💪",
        actionText: "підтримав(ла) та побажав(ла) успіху",
        endingEmoji: "💪",
      },
      {
        id: "похвалити",
        title: "Похвалити",
        triggers: ["похвалити"],
        leadingEmoji: "🏆",
        actionText: "похвалив(ла) за чудові досягнення",
        endingEmoji: "🏆",
      },
      {
        id: "дякую",
        title: "Дякую",
        triggers: ["дякую"],
        leadingEmoji: "🤗",
        actionText: "щиро подякував(ла)",
        endingEmoji: "🤗",
      },
    ],
  },
  {
    id: "jokes",
    title: "Жарти та приколи",
    actions: [
      {
        id: "вдарити",
        title: "Вдарити",
        triggers: ["вдарити"],
        leadingEmoji: "👋",
        actionText: "дав(ла) добрячого ляпаса",
        endingEmoji: "👋",
      },
      {
        id: "облити",
        title: "Облити",
        triggers: ["облити"],
        leadingEmoji: "💦",
        actionText: "несподівано облив(ла) водою",
        endingEmoji: "💦",
      },
      {
        id: "штовхнути",
        title: "Штовхнути",
        triggers: ["штовхнути"],
        leadingEmoji: "🫸",
        actionText: "легенько штовхнув(ла)",
        endingEmoji: "😆",
      },
      {
        id: "кинути яйце",
        title: "Кинути яйце",
        triggers: ["кинути яйце"],
        leadingEmoji: "🥚",
        actionText: "запустив(ла) яйцем у",
        endingEmoji: "🥚",
      },
      {
        id: "підколоти",
        title: "Підколоти",
        triggers: ["підколоти"],
        leadingEmoji: "🤡",
        actionText: "добряче потролив(ла)",
        endingEmoji: "🤡",
      },
      {
        id: "підставити підніжку",
        title: "Підставити підніжку",
        triggers: ["підставити підніжку"],
        leadingEmoji: "🦶",
        actionText: "підставив(ла) ногу",
        endingEmoji: "😂",
      },
      {
        id: "вилити відро води",
        title: "Вилити відро води",
        triggers: ["вилити відро води"],
        leadingEmoji: "🪣",
        actionText: "вилив(ла) ціле відро води на",
        endingEmoji: "🪣",
      },
      {
        id: "відлупцювати подушкою",
        title: "Відлупцювати подушкою",
        triggers: ["відлупцювати подушкою"],
        leadingEmoji: "🧹",
        actionText: "влаштував(ла) подушкову битву з",
        endingEmoji: "🛏️",
      },
    ],
  },
  {
    id: "aggressive-funny",
    title: "Агресивні та кумедні",
    actions: [
      {
        id: "викликати на бій",
        title: "Викликати на бій",
        triggers: ["викликати на бій"],
        leadingEmoji: "🥊",
        actionText: "викликав(ла) на поєдинок",
        endingEmoji: "🥊",
      },
      {
        id: "пригрозити",
        title: "Пригрозити",
        triggers: ["пригрозити"],
        leadingEmoji: "🔫",
        actionText: "жартома пригрозив(ла)",
        endingEmoji: "🔫",
      },
      {
        id: "заморозити",
        title: "Заморозити",
        triggers: ["заморозити"],
        leadingEmoji: "🧊",
        actionText: "перетворив(ла) на крижану статую",
        endingEmoji: "🧊",
      },
      {
        id: "обізвати жабою",
        title: "Обізвати жабою",
        triggers: ["обізвати жабою"],
        leadingEmoji: "🐸",
        actionText: "назвав(ла) болотяною жабою",
        endingEmoji: "🐸",
      },
      {
        id: "налякати",
        title: "Налякати",
        triggers: ["налякати"],
        leadingEmoji: "🪳",
        actionText: "підкинув(ла) таргана до",
        endingEmoji: "🪳",
      },
      {
        id: "влаштувати пастку",
        title: "Влаштувати пастку",
        triggers: ["влаштувати пастку"],
        leadingEmoji: "🪤",
        actionText: "хитро підловив(ла)",
        endingEmoji: "🪤",
      },
      {
        id: "врізати",
        title: "Врізати",
        triggers: ["врізати", "сильно вдарити"],
        leadingEmoji: "👊",
        actionText: "з усієї сили врізав(ла)",
        endingEmoji: "👊",
      },
      {
        id: "облити холодною водою",
        title: "Облити холодною водою",
        triggers: ["облити холодною водою"],
        leadingEmoji: "💦",
        actionText: "несподівано вилив(ла) відро холодної води на",
        endingEmoji: "💦",
      },
      {
        id: "сильно штовхнути",
        title: "Сильно штовхнути",
        triggers: ["сильно штовхнути"],
        leadingEmoji: "🫸",
        actionText: "добряче штовхнув(ла)",
        endingEmoji: "😂",
      },
      {
        id: "дати ляпаса",
        title: "Дати ляпаса",
        triggers: ["дати ляпаса"],
        leadingEmoji: "😈",
        actionText: "дзвінко дав(ла) ляпаса",
        endingEmoji: "👋",
      },
    ],
  },
] as const satisfies readonly ChatPrankCategory[];

export type ChatPrankAction =
  (typeof chatPrankCategories)[number]["actions"][number]["id"];

export function getChatPrankDefinition(action: ChatPrankAction) {
  for (const category of chatPrankCategories) {
    const definition = category.actions.find(item => item.id === action);
    if (definition) return definition;
  }
  return undefined;
}
