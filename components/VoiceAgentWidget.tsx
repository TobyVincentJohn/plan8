'use client';

import { useEffect } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'agent-id'?: string;
        variant?: string;
        'dynamic-variables'?: string;
        'action-text'?: string;
        'start-call-text'?: string;
        'end-call-text'?: string;
        'expand-text'?: string;
        'listening-text'?: string;
        'speaking-text'?: string;
      };
    }
  }
}

interface VoiceAgentWidgetProps {
  agentId: string;
  userId: string;
  groupId: string;
  destination: string;
}

export default function VoiceAgentWidget({
  agentId,
  userId,
  groupId,
  destination,
}: VoiceAgentWidgetProps) {
  console.log('VoiceAgentWidget props:', { agentId, userId, groupId, destination });
  
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  const dynamicVariables = JSON.stringify({
    user_id: userId,
    group_id: groupId,
    destination: destination,
  });

  return (
    <div className="w-full h-full relative" suppressHydrationWarning>
      <elevenlabs-convai
        agent-id={agentId}
        variant="expanded"
        dynamic-variables={dynamicVariables}
        action-text="Need help planning your trip?"
        start-call-text="Start Chat"
        end-call-text="End"
        expand-text="Open Assistant"
        listening-text="Listening..."
        speaking-text="Maya is speaking..."
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      ></elevenlabs-convai>
    </div>
  );
}