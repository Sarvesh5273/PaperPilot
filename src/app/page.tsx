import { WebMCPStatus } from '@/components/WebMCPStatus';
import { ResearchPanel } from '@/components/ResearchPanel';
import { EditorPanel } from '@/components/EditorPanel';
import { AgentLog } from '@/components/AgentLog';

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <WebMCPStatus />
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        <div className="col-span-3 overflow-y-auto"><ResearchPanel /></div>
        <div className="col-span-6 overflow-y-auto"><EditorPanel /></div>
        <div className="col-span-3 overflow-y-auto"><AgentLog /></div>
      </div>
    </div>
  );
}
