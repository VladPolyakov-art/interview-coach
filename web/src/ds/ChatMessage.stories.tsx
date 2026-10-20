import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";
import { ChipGroup, Chip } from "./Badge";
import { ChatLog, ChatMessage } from "./ChatMessage";
import { ComposerAttachment } from "./Composer";

/** ChatMessage (G22): Mike's setup chat on Home. Mike = plain text, no bubble; the user = a subtle end-aligned bubble.
 * `pending` only while real work runs (reading a file, opening a link); `error` = alert icon, no status colour. */
const meta: Meta<typeof ChatMessage> = { title: "DS/ChatMessage", component: ChatMessage, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof ChatMessage>;

const frame = { width: "var(--layout-narrow)", maxWidth: "100%" } as const;

export const Conversation: Story = {
  render: () => (
    <div style={frame}>
      <ChatLog label="Setup with Mike">
        <ChatMessage speaker="mike" name="Mike">Which job are we preparing for? Paste a job or a link, or pick one you saved.</ChatMessage>
        <ChatMessage speaker="user">Lumen Health</ChatMessage>
        <ChatMessage
          speaker="mike"
          name="Mike"
          actions={(
            <ChipGroup label="Quick replies" hideLabel>
              <Chip>HR screen</Chip><Chip>Behavioural</Chip><Chip>Technical</Chip><Chip>Unseen mix</Chip>
            </ChipGroup>
          )}
        >
          What kind of round is it? Last time it was Behavioural.
        </ChatMessage>
      </ChatLog>
    </div>
  ),
};

export const UserWithAttachment: Story = {
  render: () => (
    <div style={frame}>
      <ChatLog label="Setup with Mike">
        <ChatMessage speaker="user" attachment={<ComposerAttachment icon="file" title="kestrel-pay-senior-pd.pdf" meta="184 KB" />} />
        <ChatMessage speaker="mike" state="pending" pendingLabel="Reading the file…" />
      </ChatLog>
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div style={frame}>
      <ChatLog label="Setup with Mike">
        <ChatMessage speaker="mike" state="error" actions={<Button variant="secondary" size="sm">Use general questions</Button>}>
          I couldn't open this page: it needs a login. Paste the job text here instead, or carry on with general questions.
        </ChatMessage>
      </ChatLog>
    </div>
  ),
};

/** 375: the user bubble may take 88% of the log. */
export const Narrow: Story = {
  render: () => (
    <div style={{ width: "21.4375rem" }}>
      <ChatLog label="Setup with Mike">
        <ChatMessage speaker="mike" name="Mike">Anything else I should know? For example a story from your CV you want to use, or a question that worries you.</ChatMessage>
        <ChatMessage speaker="user">I always ramble on “tell me about yourself”, please push me on that one.</ChatMessage>
      </ChatLog>
    </div>
  ),
};
