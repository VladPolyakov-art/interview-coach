import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

const meta: Meta = { title: "DS/Dialog" };
export default meta;
function Demo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>End round…</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="End this round?"
        actions={<><Button variant="ghost" onClick={() => setOpen(false)}>Keep going</Button><Button variant="primary" onClick={() => setOpen(false)}>End and see debrief</Button></>}
      >
        <p>You answered 2 of 5 questions. The debrief covers what you answered.</p>
      </Dialog>
    </>
  );
}
export const Default: StoryObj = { render: () => <Demo /> };
