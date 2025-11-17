import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledTask {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  flora_tasks: {
    title: string;
    notes: string | null;
    flora_lists: {
      name: string;
      icon: string;
    };
  };
}

function escapeICSValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatDateTime(date: string, time: string): string {
  // Format: YYYYMMDDTHHMMSS
  const [year, month, day] = date.split('-');
  const [hour, min] = time.split(':');
  return `${year}${month}${day}T${hour}${min}00`;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user ID from query params
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId parameter required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role for server-side queries
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all scheduled tasks for the user
    const { data: scheduledTasks, error } = await supabase
      .from('flora_scheduled_tasks')
      .select(`
        id,
        created_at,
        scheduled_date,
        start_time,
        end_time,
        flora_tasks!inner (
          title,
          notes,
          user_id,
          flora_lists (
            name,
            icon
          )
        )
      `)
      .eq('flora_tasks.user_id', userId);

    if (error) {
      throw error;
    }

    // Generate ICS content
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Flora Task Manager//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Flora Tasks',
      'X-WR-TIMEZONE:UTC',
      'X-WR-CALDESC:Your Flora scheduled tasks',
      'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
      'X-PUBLISHED-TTL:PT15M',
    ];

    // Add each task as an event
    if (scheduledTasks && Array.isArray(scheduledTasks)) {
      scheduledTasks.forEach((item: any) => {
        const task = item.flora_tasks;
        if (!task || !Array.isArray(task) || task.length === 0) return;
        
        const taskData = task[0];
        const startDateTime = formatDateTime(item.scheduled_date, item.start_time);
        const endDateTime = formatDateTime(item.scheduled_date, item.end_time);
        
        // Generate stable UID based on scheduled task ID
        const uid = `flora-task-${item.id}@flora-calendar`;
        
        // Use created_at as DTSTAMP for stable versioning
        const createdDate = new Date(item.created_at);
        const dtstamp = createdDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const listIcon = taskData.flora_lists?.[0]?.icon || '📋';
        const listName = taskData.flora_lists?.[0]?.name || 'Task';
        const title = `${listIcon} ${taskData.title}`;
        
        let description = `List: ${listName}`;
        if (taskData.notes) {
          description += `\\n\\nNotes: ${escapeICSValue(taskData.notes)}`;
        }

        icsLines.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART:${startDateTime}`,
          `DTEND:${endDateTime}`,
          `SUMMARY:${escapeICSValue(title)}`,
          `DESCRIPTION:${description}`,
          'SEQUENCE:0',
          'STATUS:CONFIRMED',
          'TRANSP:OPAQUE',
          'END:VEVENT'
        );
      });
    }

    icsLines.push('END:VCALENDAR');

    const icsContent = icsLines.join('\r\n');

    // Return ICS file with proper headers for calendar subscription
    return new Response(icsContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="flora-calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating calendar feed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
