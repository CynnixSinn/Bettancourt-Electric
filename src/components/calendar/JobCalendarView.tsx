"use client";

import { useState } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { WorkOrder } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface JobCalendarViewProps {
  workOrders: WorkOrder[];
}

export default function JobCalendarView({ workOrders }: JobCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const workOrdersOnSelectedDate = selectedDate 
    ? workOrders.filter(wo => wo.deadline && format(new Date(wo.deadline), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
    : [];

  const eventDays = workOrders.map(wo => wo.deadline).filter(Boolean) as Date[];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Job Calendar</CardTitle>
        <CardDescription>View work order deadlines. Click on a date to see jobs due.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/2 flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border shadow-sm p-3"
            modifiers={{
              event: eventDays.map(date => new Date(date))
            }}
            modifiersStyles={{
              event: {
                border: '2px solid hsl(var(--primary))',
                borderRadius: '9999px',
                color: 'hsl(var(--primary-foreground))',
                backgroundColor: 'hsl(var(--primary))',
              }
            }}
            components={{
              DayContent: ({ date, displayMonth }) => {
                const isEvent = eventDays.some(eventDate => 
                  format(new Date(eventDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                );
                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {date.getDate()}
                    {isEvent && displayMonth.getMonth() === date.getMonth() && (
                      <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-accent rounded-full"></span>
                    )}
                  </div>
                );
              },
            }}
          />
        </div>
        <div className="md:w-1/2">
          <h3 className="text-lg font-semibold mb-3">
            Jobs due on: {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
          </h3>
          {workOrdersOnSelectedDate.length > 0 ? (
            <ScrollArea className="h-[300px] border rounded-md p-3">
              <ul className="space-y-3">
                {workOrdersOnSelectedDate.map(wo => (
                  <li key={wo.id} className="p-3 bg-muted/30 rounded-md shadow-sm">
                    <p className="font-semibold text-primary">{wo.customerDetails.name} - {wo.location}</p>
                    <p className="text-sm text-muted-foreground truncate">{wo.jobDescription}</p>
                    <div className="mt-1">
                       <Badge variant={wo.urgency === 'High' ? 'destructive' : wo.urgency === 'Medium' ? 'secondary' : 'default'}>
                         {wo.urgency}
                       </Badge>
                       <Badge variant="outline" className="ml-2">{wo.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground italic">No jobs scheduled for this date.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
