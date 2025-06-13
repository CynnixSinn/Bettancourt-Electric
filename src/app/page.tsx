"use client";

import { useState, useEffect } from 'react';
import AppHeader from '@/components/AppHeader';
import WorkOrderForm from '@/components/work-order/WorkOrderForm';
import InvoiceGenerator from '@/components/invoice/InvoiceGenerator';
import JobCalendarView from '@/components/calendar/JobCalendarView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { WorkOrder } from '@/lib/types';
import { ListChecks, FileText, CalendarDays, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWorkOrderForEditing, setSelectedWorkOrderForEditing] = useState<WorkOrder | null>(null);
  const [activeTab, setActiveTab] = useState("create-order");

  // Load work orders from local storage on mount
  useEffect(() => {
    const storedWorkOrders = localStorage.getItem('fieldFlowWorkOrders');
    if (storedWorkOrders) {
      try {
        const parsedOrders = JSON.parse(storedWorkOrders);
        // Dates are stored as strings, convert them back
        const ordersWithDates = parsedOrders.map((order: WorkOrder) => ({
          ...order,
          createdAt: new Date(order.createdAt),
          deadline: order.deadline ? new Date(order.deadline) : undefined,
        }));
        setWorkOrders(ordersWithDates);
      } catch (error) {
        console.error("Failed to parse work orders from local storage", error);
        setWorkOrders([]); // fallback to empty if parsing fails
      }
    }
  }, []);

  // Save work orders to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('fieldFlowWorkOrders', JSON.stringify(workOrders));
  }, [workOrders]);

  const handleWorkOrderCreated = (newOrder: WorkOrder) => {
    setWorkOrders(prevOrders => [...prevOrders, newOrder]);
    setSelectedWorkOrderForEditing(null); // Clear editing state
  };
  
  const handleWorkOrderUpdated = (updatedOrder: WorkOrder) => {
    setWorkOrders(prevOrders => 
      prevOrders.map(wo => wo.id === updatedOrder.id ? updatedOrder : wo)
    );
    // If the updated order is the one being edited, update it, otherwise clear editing state
    if (selectedWorkOrderForEditing?.id === updatedOrder.id) {
      setSelectedWorkOrderForEditing(updatedOrder);
    } else {
       setSelectedWorkOrderForEditing(null); 
    }
  };

  const handleInvoiceGeneratedForWorkOrder = (workOrderId: string, invoiceText: string, totalAmount: number) => {
    setWorkOrders(prevOrders =>
      prevOrders.map(wo =>
        wo.id === workOrderId
          ? { ...wo, invoiceText, invoiceTotalAmount: totalAmount, status: 'Invoiced' }
          : wo
      )
    );
  };

  const handleEditWorkOrder = (workOrder: WorkOrder) => {
    setSelectedWorkOrderForEditing(workOrder);
    setActiveTab("create-order"); // Switch to the form tab for editing
  };
  
  const handleCreateNewWorkOrder = () => {
    setSelectedWorkOrderForEditing(null);
    setActiveTab("create-order");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="create-order">
              <ListChecks className="mr-2 h-4 w-4" /> {selectedWorkOrderForEditing ? 'Edit Order' : 'New Work Order'}
            </TabsTrigger>
            <TabsTrigger value="view-orders">
              <ListChecks className="mr-2 h-4 w-4" /> View Orders
            </TabsTrigger>
            <TabsTrigger value="generate-invoice">
              <FileText className="mr-2 h-4 w-4" /> Invoice Generator
            </TabsTrigger>
            <TabsTrigger value="job-calendar">
              <CalendarDays className="mr-2 h-4 w-4" /> Job Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create-order">
            <WorkOrderForm 
              key={selectedWorkOrderForEditing?.id || 'new'} // Force re-render with new key on selection change
              onWorkOrderCreated={handleWorkOrderCreated}
              selectedWorkOrder={selectedWorkOrderForEditing}
              onWorkOrderUpdated={handleWorkOrderUpdated}
            />
          </TabsContent>

          <TabsContent value="view-orders">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Existing Work Orders</CardTitle>
                  <Button variant="outline" onClick={handleCreateNewWorkOrder}>
                     <PlusCircleIcon className="mr-2 h-4 w-4" /> Create New Order
                  </Button>
                </div>
                <CardDescription>Manage and view details of all work orders.</CardDescription>
              </CardHeader>
              <CardContent>
                {workOrders.length > 0 ? (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {workOrders.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).map(wo => (
                        <Card key={wo.id} className="overflow-hidden">
                          <CardHeader className="bg-muted/20 p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">Job ID: {wo.id.substring(0, 8)}...</CardTitle>
                                <CardDescription>Customer: {wo.customerDetails.name}</CardDescription>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => handleEditWorkOrder(wo)} aria-label="Edit work order">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 text-sm space-y-1">
                            <p><strong>Location:</strong> {wo.location}</p>
                            <p className="truncate"><strong>Description:</strong> {wo.jobDescription}</p>
                            <p><strong>Created:</strong> {new Date(wo.createdAt).toLocaleDateString()}</p>
                            {wo.deadline && <p><strong>Deadline:</strong> {new Date(wo.deadline).toLocaleDateString()}</p>}
                             <div className="flex gap-2 mt-2">
                                <Badge variant={wo.urgency === 'High' ? 'destructive' : wo.urgency === 'Medium' ? 'secondary' : 'default'}>
                                  {wo.urgency}
                                </Badge>
                                <Badge variant="outline">{wo.status}</Badge>
                             </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No work orders found. Create one to get started!</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate-invoice">
            <InvoiceGenerator workOrders={workOrders} onInvoiceGenerated={handleInvoiceGeneratedForWorkOrder} />
          </TabsContent>

          <TabsContent value="job-calendar">
            <JobCalendarView workOrders={workOrders} />
          </TabsContent>
        </Tabs>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} FieldFlow. All rights reserved.
      </footer>
    </div>
  );
}

// Helper icon, can be moved to its own file or use lucide-react if available and preferred
function PlusCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="16" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  )
}
