import React from 'react';
import { Avatar } from '../ui/Avatar';
import { FileIcon, DownloadIcon } from 'lucide-react';
interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isOwn: boolean;
  sender?: {
    name: string;
    avatar: string;
  };
  attachment?: {
    name: string;
    size: string;
    type: 'file' | 'image';
  };
  codeBlock?: {
    language: string;
    code: string;
  };
}
export function MessageBubble({
  content,
  timestamp,
  isOwn,
  sender,
  attachment,
  codeBlock
}: MessageBubbleProps) {
  return <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && sender && <Avatar src={sender.avatar} name={sender.name} size="sm" />}
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Code Block */}
        {codeBlock && <div className="bg-gray-900 rounded-xl p-4 mb-2 overflow-x-auto">
            <pre className="text-sm text-green-400 font-mono">
              <code>{codeBlock.code}</code>
            </pre>
          </div>}

        {/* Message Content */}
        {content && <div className={`
              px-4 py-3 rounded-2xl
              ${isOwn ? 'bg-blue-500 text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'}
            `}>
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          </div>}

        {/* Attachment */}
        {attachment && <div className={`
            mt-2 flex items-center gap-3 p-3 rounded-xl border
            ${isOwn ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}
          `}>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileIcon className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {attachment.name}
              </p>
              <p className="text-xs text-gray-500">{attachment.size}</p>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <DownloadIcon className="w-5 h-5" />
            </button>
          </div>}

        {/* Timestamp */}
        <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right' : ''}`}>
          {timestamp}
        </p>
      </div>
    </div>;
}