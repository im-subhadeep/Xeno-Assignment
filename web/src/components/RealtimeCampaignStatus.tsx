// components/RealtimeCampaignStatus.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, Send } from 'lucide-react';

interface CampaignUpdate {
  campaignId: string;
  status: string;
  data: any;
  timestamp: string;
}

interface RealtimeCampaignStatusProps {
  campaignId: string;
}

export function RealtimeCampaignStatus({ campaignId }: RealtimeCampaignStatusProps) {
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [queueStats, setQueueStats] = useState<any>(null);

  useEffect(() => {
    // Connect to Server-Sent Events for real-time updates
    const eventSource = new EventSource(`/api/realtime/campaign/${campaignId}`);

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      console.log('Connected to real-time campaign updates');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'connected') {
          setUpdates(prev => [data, ...prev.slice(0, 19)]); // Keep last 20 updates
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('disconnected');
      console.error('SSE connection error');
    };

    // Fetch queue statistics periodically
    const fetchQueueStats = async () => {
      try {
        const response = await fetch('/api/queue/status');
        if (response.ok) {
          const stats = await response.json();
          setQueueStats(stats);
        }
      } catch (error) {
        console.error('Error fetching queue stats:', error);
      }
    };

    fetchQueueStats();
    const statsInterval = setInterval(fetchQueueStats, 5000); // Every 5 seconds

    return () => {
      eventSource.close();
      clearInterval(statsInterval);
    };
  }, [campaignId]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'queued':
        return <Clock className="h-4 w-4" />;
      case 'sent_to_vendor':
        return <Send className="h-4 w-4" />;
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'queued':
        return 'bg-blue-500';
      case 'sent_to_vendor':
        return 'bg-yellow-500';
      case 'sent':
      case 'delivered':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            Real-time Campaign Status
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
              {connectionStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queueStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {queueStats.campaignQueue.waiting}
                </div>
                <div className="text-sm text-muted-foreground">Waiting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {queueStats.campaignQueue.active}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {queueStats.campaignQueue.completed}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {queueStats.campaignQueue.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          )}

          {queueStats && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing Progress</span>
                <span>
                  {queueStats.campaignQueue.completed + queueStats.campaignQueue.failed} / 
                  {queueStats.campaignQueue.waiting + queueStats.campaignQueue.active + 
                   queueStats.campaignQueue.completed + queueStats.campaignQueue.failed}
                </span>
              </div>
              <Progress 
                value={
                  ((queueStats.campaignQueue.completed + queueStats.campaignQueue.failed) / 
                   Math.max(1, queueStats.campaignQueue.waiting + queueStats.campaignQueue.active + 
                            queueStats.campaignQueue.completed + queueStats.campaignQueue.failed)) * 100
                }
                className="w-full"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Live Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {updates.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No updates yet. Updates will appear here in real-time.
              </div>
            ) : (
              updates.map((update, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className={`p-1.5 rounded-full ${getStatusColor(update.status)}`}>
                    {getStatusIcon(update.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{update.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(update.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm">
                      {update.data && typeof update.data === 'object' && (
                        <div className="space-y-1">
                          {Object.entries(update.data).map(([key, value]) => (
                            <div key={key} className="text-xs">
                              <span className="font-medium">{key}:</span>{' '}
                              <span className="text-muted-foreground">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
