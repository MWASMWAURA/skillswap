import React, { useState } from 'react';
interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}
interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}
export function Tabs({
  tabs,
  defaultTab
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0].id);
  return <div>
      <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <nav className="-mb-px flex space-x-8 min-w-max px-1" aria-label="Tabs">
          {tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `} aria-current={activeTab === tab.id ? 'page' : undefined}>
              {tab.label}
            </button>)}
        </nav>
      </div>
      <div className="mt-6">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>;
}