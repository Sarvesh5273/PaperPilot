import { WebMCPStatus } from '@/components/WebMCPStatus';
import { ResearchPanel } from '@/components/ResearchPanel';
import { EditorPanel } from '@/components/EditorPanel';
import { AgentLog } from '@/components/AgentLog';

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-ambient-canvas text-foreground overflow-hidden">
      <WebMCPStatus />
      <main className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        <section className="col-span-12 md:col-span-3 h-full overflow-hidden flex flex-col min-h-0">
          <ResearchPanel />
        </section>
        <section className="col-span-12 md:col-span-6 h-full overflow-hidden flex flex-col min-h-0">
          <EditorPanel />
        </section>
        <section className="col-span-12 md:col-span-3 h-full overflow-hidden flex flex-col min-h-0">
          <AgentLog />
        </section>
      </main>
    </div>
  );
}
