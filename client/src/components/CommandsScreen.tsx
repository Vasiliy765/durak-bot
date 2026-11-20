import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Coins,
  Copy,
  Dice5,
  Gamepad2,
  Heart,
  MessageCircleMore,
  ShieldCheck,
} from "lucide-react";
import { commandGuideGroups, type GuideEntry, type GuideGroup } from "./commandsGuideData";
import "./CommandsScreen.css";

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Clipboard is unavailable");
}

function iconFor(group: GuideGroup) {
  const props = { size: 17, "aria-hidden": true as const };
  if (group.id === "games") return <Gamepad2 {...props} />;
  if (group.id === "actions") return <Heart {...props} />;
  if (group.id === "economy") return <Coins {...props} />;
  return <BookOpen {...props} />;
}

function CommandCard({
  entry,
  copy,
  copied,
  onOpenProfile,
}: {
  entry: GuideEntry;
  copy: (key: string, text: string) => void;
  copied: string;
  onOpenProfile: () => void;
}) {
  return (
    <article className="command-entry" id={`command-${entry.id}`}>
      <div className="command-entry-heading">
        <h3>{entry.title}</h3>
        {entry.navigationOnly && <span className="command-nav-badge">Mini App</span>}
      </div>
      <p className="command-entry-description">{entry.description}</p>
      {entry.target && (
        <p className="command-target"><b>Кому й де:</b> {entry.target}</p>
      )}
      {entry.navigationTarget === "profile" && (
        <button
          className="command-nav-link"
          type="button"
          onClick={onOpenProfile}
        >
          Відкрити профіль <ArrowRight size={14} />
        </button>
      )}
      {entry.examples && entry.examples.length > 0 && (
        <div className="command-examples">
          {entry.examples.map((example, index) => {
            const key = `${entry.id}-${index}`;
            return (
              <div className="command-example" key={key}>
                <div className="command-example-copy">
                  <span>{example.label}</span>
                  <code>{example.text}</code>
                  {example.note && <small>{example.note}</small>}
                </div>
                <button
                  className="command-copy-button"
                  type="button"
                  onClick={() => copy(key, example.text)}
                  aria-label={`${copied === key ? "Скопійовано" : "Скопіювати"}: ${example.text}`}
                >
                  {copied === key ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copied === key ? "Скопійовано" : "Копіювати"}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
      {entry.notes && entry.notes.length > 0 && (
        <ul className="command-notes">
          {entry.notes.map(note => <li key={note}>{note}</li>)}
        </ul>
      )}
      {entry.responses && entry.responses.length > 0 && (
        <details className="command-response">
          <summary>
            {entry.responseLabel || (entry.responses.length > 1
              ? `Приклади відповідей бота (${entry.responses.length})`
              : "Приклад відповіді бота")}
          </summary>
          <div className="command-response-list">
            {entry.responses.map((response, index) => (
              <pre key={`${entry.id}-response-${index}`}>{response}</pre>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}

export default function CommandsScreen({
  onOpenProfile,
}: {
  onOpenProfile: () => void;
}) {
  const [copied, setCopied] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<GuideGroup["id"], boolean>>({
    games: true,
    actions: false,
    economy: false,
    other: false,
  });

  const copy = async (key: string, text: string) => {
    try {
      await writeClipboard(text);
      setCopied(key);
      setCopyMessage("Приклад скопійовано в буфер обміну.");
    } catch {
      setCopied("");
      setCopyMessage("Не вдалося скопіювати — виділіть приклад вручну.");
    }
    window.setTimeout(() => {
      setCopied(current => current === key ? "" : current);
      setCopyMessage("");
    }, 2200);
  };

  const renderEntries = (entries: GuideEntry[]) => (
    <div className="commands-entry-grid">
      {entries.map(entry => (
        <CommandCard
          key={entry.id}
          entry={entry}
          copy={copy}
          copied={copied}
          onOpenProfile={onOpenProfile}
        />
      ))}
    </div>
  );

  return (
    <section className="page-panel commands-page">
      <div className="commands-heading">
        <span className="eyebrow"><ShieldCheck size={13} /> ДОВІДНИК ОПЕРАТИВНИКА</span>
        <h1><MessageCircleMore size={26} /> Команди бота</h1>
        <p>
          Реальні команди й фрази Telegram-бота. Приклади можна скопіювати кнопкою; якщо потрібен адресат, використайте reply або вкажіть його username, як описано поруч.
        </p>
        <div className="commands-safety-note">
          <Dice5 size={15} /> У групових іграх діють умови та суми, наведені в кожному прикладі. Монети показані як 🪙.
        </div>
        <span className="commands-copy-status" role="status" aria-live="polite">{copyMessage}</span>
      </div>

      <div className="commands-groups">
        {commandGuideGroups.map(group => (
          <details
            className={`commands-category commands-category--${group.id}`}
            key={group.id}
            open={openGroups[group.id]}
            onToggle={event => {
              const next = event.currentTarget.open;
              setOpenGroups(current => current[group.id] === next
                ? current
                : { ...current, [group.id]: next });
            }}
          >
            <summary>
              <span className="commands-category-icon">{iconFor(group)}</span>
              <span className="commands-category-copy">
                <b>{group.title}</b>
                <small>
                  {group.id === "actions"
                    ? `${group.entries.length} дій · ${group.sections?.length ?? 0} категорії`
                    : `${group.entries.length} розділів`}
                </small>
              </span>
              <span className="commands-expand-mark" aria-hidden="true">+</span>
            </summary>
            <div className="commands-category-body">
              <p className="commands-category-description">{group.description}</p>
              {group.sections ? (
                <div className="commands-subsections">
                  {group.sections.map(section => (
                    <section className="commands-subsection" key={section.title}>
                      <div className="commands-subsection-heading">
                        <h2>{section.title}</h2>
                        <span>{section.entries.length} дій</span>
                      </div>
                      {renderEntries(section.entries)}
                    </section>
                  ))}
                </div>
              ) : renderEntries(group.entries)}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
