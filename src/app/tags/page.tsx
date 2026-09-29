import { connection } from "next/server";
import { BackButton } from "@/components/BackButton";
import { Header } from "@/components/Header";
import { MyTagsEditor } from "@/components/MyTagsEditor";
import { listMyTags } from "@/lib/my-tags";

export default async function MyTagsPage() {
  await connection(); // always read the latest tags, never a copy made at build time
  const tags = await listMyTags();
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-4">
        <BackButton />
        <div>
          <h1 className="font-serif text-4xl">My tags</h1>
          <p className="mt-1 text-muted">
            Tags the AI adds whenever they fit, e.g. <b>healthy</b> or <b>dinner</b>. Describe what each one means to you
            and the AI will follow it. They apply to new saves; tap <b>Re-run AI</b> on older items to add them there.
          </p>
        </div>
        <MyTagsEditor tags={tags} />
      </main>
    </>
  );
}
