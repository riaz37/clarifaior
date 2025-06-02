"use client";

import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode, BaseNodeData } from './BaseNode';
import { Badge } from '@repo/ui/badge';
import { Clock, Webhook, Mail, MessageSquare, Hand } from 'lucide-react';

interface TriggerNodeData extends BaseNodeData {
  category: 'trigger';
  triggerType?: 'manual' | 'webhook' | 'schedule' | 'gmail' | 'slack';
}

export const TriggerNode = memo(({ data, selected }: NodeProps<TriggerNodeData>) => {
  const getTriggerIcon = (type?: string) => {
    switch (type) {
      case 'manual':
        return <Hand className="h-4 w-4" />;
      case 'webhook':
        return <Webhook className="h-4 w-4" />;
      case 'schedule':
        return <Clock className="h-4 w-4" />;
      case 'gmail':
        return <Mail className="h-4 w-4" />;
      case 'slack':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <span className="text-lg">⚡</span>;
    }
  };

  const getTriggerDetails = () => {
    const config = data.config || {};
    
    switch (data.triggerType) {
      case 'schedule':
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Schedule</div>
            <Badge variant="outline" className="text-xs">
              {config.cronExpression || '0 9 * * *'}
            </Badge>
            {config.timezone && (
              <div className="text-xs text-gray-500">{config.timezone}</div>
            )}
          </div>
        );
      
      case 'webhook':
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Webhook URL</div>
            <div className="text-xs text-cyan-400 font-mono bg-black/20 p-1 rounded">
              {config.endpoint || '/webhook/...'}
            </div>
          </div>
        );
      
      case 'gmail':
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Gmail Filter</div>
            {config.query && (
              <Badge variant="outline" className="text-xs">
                {config.query}
              </Badge>
            )}
            {config.labelIds && config.labelIds.length > 0 && (
              <div className="text-xs text-gray-500">
                Labels: {config.labelIds.join(', ')}
              </div>
            )}
          </div>
        );
      
      case 'slack':
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Slack Channel</div>
            <Badge variant="outline" className="text-xs">
              {config.channel || '#general'}
            </Badge>
          </div>
        );
      
      case 'manual':
        return (
          <div className="text-xs text-gray-400">
            Click to start execution
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <BaseNode
      data={{
        ...data,
        category: 'trigger',
      }}
      selected={selected}
      showTargetHandle={false} // Triggers don't have input
      onConfigure={() => console.log('Configure trigger')}
      onDelete={() => console.log('Delete trigger')}
    >
      <div className="flex items-center space-x-2 mb-2">
        {getTriggerIcon(data.triggerType)}
        <span className="text-sm text-gray-300">Trigger</span>
      </div>
      
      {getTriggerDetails()}
    </BaseNode>
  );
});

TriggerNode.displayName = 'TriggerNode';
