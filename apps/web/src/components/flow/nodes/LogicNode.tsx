"use client";

import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { BaseNode, BaseNodeData } from './BaseNode';
import { Badge } from '@repo/ui/badge';
import { GitBranch, RotateCcw, HelpCircle } from 'lucide-react';

interface LogicNodeData extends BaseNodeData {
  category: 'logic';
  logicType?: 'condition' | 'loop';
}

export const LogicNode = memo(({ data, selected }: NodeProps<LogicNodeData>) => {
  const getLogicIcon = (type?: string) => {
    switch (type) {
      case 'condition':
        return <GitBranch className="h-4 w-4" />;
      case 'loop':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  const getLogicDetails = () => {
    const config = data.config || {};
    
    switch (data.logicType) {
      case 'condition':
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">If/Else Condition</div>
            
            {config.condition && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Variable:</div>
                <div className="text-xs text-gray-300 bg-black/20 p-1 rounded font-mono">
                  {config.condition}
                </div>
              </div>
            )}
            
            <div className="flex space-x-2">
              {config.operator && (
                <Badge variant="outline" className="text-xs">
                  {config.operator}
                </Badge>
              )}
              {config.value && (
                <Badge variant="outline" className="text-xs">
                  {config.value}
                </Badge>
              )}
            </div>
            
            <div className="text-xs text-gray-500">
              Branches: True / False
            </div>
          </div>
        );
      
      case 'loop':
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Loop Control</div>
            
            {config.loopType && (
              <Badge variant="outline" className="text-xs">
                {config.loopType === 'forEach' ? 'For Each' : 
                 config.loopType === 'while' ? 'While' : 
                 config.loopType === 'times' ? 'Repeat' : 'Loop'}
              </Badge>
            )}
            
            {config.array && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Array:</div>
                <div className="text-xs text-gray-300 bg-black/20 p-1 rounded font-mono">
                  {config.array}
                </div>
              </div>
            )}
            
            {config.maxIterations && (
              <div className="text-xs text-gray-500">
                Max: {config.maxIterations} iterations
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="text-xs text-gray-400">
            Logic control node
          </div>
        );
    }
  };

  return (
    <BaseNode
      data={{
        ...data,
        category: 'logic',
      }}
      selected={selected}
      onConfigure={() => console.log('Configure logic')}
      onDelete={() => console.log('Delete logic')}
    >
      <div className="flex items-center space-x-2 mb-2">
        {getLogicIcon(data.logicType)}
        <span className="text-sm text-gray-300">Logic</span>
      </div>
      
      {getLogicDetails()}
    </BaseNode>
  );
});

LogicNode.displayName = 'LogicNode';
