import { notFound } from "next/navigation";
import { DialogueScene } from "@/components/DialogueScene";
import { loadNpc } from "@/lib/social-graph/model";
import { loadScript } from "@/lib/dialogue-engine/loader";

export default async function PreachScenePage({
  params,
}: {
  params: Promise<{ npcId: string }>;
}) {
  const { npcId } = await params;
  const npc = loadNpc(npcId);
  if (!npc) notFound();

  const script = loadScript(npc.introScriptId);

  return (
    <main className="relative min-h-dvh">
      <DialogueScene mode="conversion" npc={npc} script={script} />
    </main>
  );
}
