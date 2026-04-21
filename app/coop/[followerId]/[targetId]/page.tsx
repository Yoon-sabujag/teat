import { notFound } from "next/navigation";
import { DialogueScene } from "@/components/DialogueScene";
import { loadNpc, loadRelative } from "@/lib/social-graph/model";
import { loadScript } from "@/lib/dialogue-engine/loader";

export default async function CoopPreachPage({
  params,
}: {
  params: Promise<{ followerId: string; targetId: string }>;
}) {
  const { followerId, targetId } = await params;
  const follower = loadNpc(followerId);
  const target = loadRelative(followerId, targetId);
  if (!follower || !target) notFound();

  const script = loadScript(target.coopScriptId);

  return (
    <main className="relative min-h-dvh">
      <DialogueScene
        mode="coop"
        follower={follower}
        target={target}
        script={script}
      />
    </main>
  );
}
