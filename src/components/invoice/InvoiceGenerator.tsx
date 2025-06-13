"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { FileText, Loader2, PlusCircle, Trash2, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InvoicePreview from './InvoicePreview';
import type { WorkOrder, CustomerInfo, PartCost } from '@/lib/types';
import { generateInvoice, type GenerateInvoiceInput } from '@/ai/flows/invoice-generator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const partCostSchema = z.object({
  partName: z.string().min(1, "Part name is required"),
  cost: z.number().min(0, "Cost must be non-negative"),
  quantity: z.number().min(1, "Quantity must be at least 1").int(),
});

const invoiceGeneratorSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().min(1, "Customer phone is required"),
  customerAddress: z.string().min(1, "Customer address is required"),
  jobSummary: z.string().min(1, "Job summary is required"),
  partCosts: z.array(partCostSchema).min(1, "At least one part/cost item is required"),
  laborEstimate: z.number().min(0, "Labor estimate must be non-negative"),
  taxRate: z.number().min(0, "Tax rate must be non-negative").max(1, "Tax rate must be between 0 and 1 (e.g., 0.08 for 8%)"),
  selectedWorkOrderId: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceGeneratorSchema>;

interface InvoiceGeneratorProps {
  workOrders: WorkOrder[];
  onInvoiceGenerated?: (workOrderId: string, invoiceText: string, totalAmount: number) => void;
}

export default function InvoiceGenerator({ workOrders, onInvoiceGenerated }: InvoiceGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<{ text: string; total: number; customerName: string; date: Date } | null>(null);

  const { register, handleSubmit, control, reset, watch, setValue } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceGeneratorSchema),
    defaultValues: {
      partCosts: [{ partName: '', cost: 0, quantity: 1 }],
      laborEstimate: 0,
      taxRate: 0.08, // Default 8% tax
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "partCosts" });

  const selectedWorkOrderId = watch('selectedWorkOrderId');

  useEffect(() => {
    if (selectedWorkOrderId) {
      const wo = workOrders.find(w => w.id === selectedWorkOrderId);
      if (wo) {
        setValue('customerName', wo.customerDetails.name);
        setValue('customerEmail', wo.customerDetails.email);
        setValue('customerPhone', wo.customerDetails.phone);
        setValue('customerAddress', wo.customerDetails.address);
        setValue('jobSummary', wo.jobDescription);
        if (wo.partCosts && wo.partCosts.length > 0) {
          setValue('partCosts', wo.partCosts);
        } else {
           setValue('partCosts', [{ partName: '', cost: 0, quantity: 1 }]); // Reset if WO has no parts
        }
        setValue('laborEstimate', wo.laborEstimate ?? 0);
        setValue('taxRate', wo.taxRate ?? 0.08);
      }
    } else {
      // Optionally reset to defaults if no work order is selected, or leave as is
      // reset(); // This would clear the form fully
    }
  }, [selectedWorkOrderId, workOrders, setValue, reset]);


  const onSubmit = async (data: InvoiceFormData) => {
    setIsGenerating(true);
    setGeneratedInvoice(null);

    const customerInfo: CustomerInfo = {
      name: data.customerName,
      email: data.customerEmail,
      phone: data.customerPhone,
      address: data.customerAddress,
    };

    const invoiceInput: GenerateInvoiceInput = {
      customerInfo,
      jobSummary: data.jobSummary,
      // Map quantity into partCosts for AI. AI schema doesn't have quantity, so we sum it.
      // Or, better, the AI prompt should be able to handle quantity. Assuming it can:
      partCosts: data.partCosts.map(p => ({ partName: p.partName, cost: p.cost * p.quantity })),
      laborEstimate: data.laborEstimate,
      taxRate: data.taxRate,
    };

    try {
      const result = await generateInvoice(invoiceInput);
      setGeneratedInvoice({ text: result.invoice, total: result.totalAmount, customerName: data.customerName, date: new Date() });
      toast({ title: 'Invoice Generated Successfully' });
      if (data.selectedWorkOrderId && onInvoiceGenerated) {
        onInvoiceGenerated(data.selectedWorkOrderId, result.invoice, result.totalAmount);
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({ title: 'Invoice Generation Failed', description: 'Could not generate invoice.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate Invoice</CardTitle>
        <CardDescription>Enter job and customer details to create a professional invoice. You can also select an existing work order to pre-fill details.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="selectedWorkOrderId">Select Work Order (Optional)</Label>
            <Controller
                name="selectedWorkOrderId"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="selectedWorkOrderId">
                            <SelectValue placeholder="Select a work order to pre-fill data" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">None (Manual Entry)</SelectItem>
                            {workOrders.map(wo => (
                                <SelectItem key={wo.id} value={wo.id}>
                                    Job ID: {wo.id.substring(0,8)}... - {wo.customerDetails.name} - {wo.jobDescription.substring(0,30)}...
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
          </div>

          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Customer Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <Input {...register('customerName')} placeholder="Name" aria-label="Customer Name" />
              <Input type="email" {...register('customerEmail')} placeholder="Email" aria-label="Customer Email" />
              <Input type="tel" {...register('customerPhone')} placeholder="Phone" aria-label="Customer Phone" />
              <Input {...register('customerAddress')} placeholder="Address" aria-label="Customer Address" />
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="jobSummary">Job Summary</Label>
            <Textarea id="jobSummary" {...register('jobSummary')} placeholder="Summary of work performed..." />
          </div>

          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium px-1">Costs</legend>
            <div className="space-y-4 mt-2">
              {fields.map((item, index) => (
                <div key={item.id} className="flex flex-col sm:flex-row gap-2 items-start p-2 border rounded-md">
                  <Input {...register(`partCosts.${index}.partName`)} placeholder="Part/Service Name" className="flex-grow" aria-label={`Part name ${index + 1}`} />
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Input type="number" step="0.01" {...register(`partCosts.${index}.cost`, { valueAsNumber: true })} placeholder="Cost per unit" className="w-full sm:w-28" aria-label={`Part cost ${index + 1}`} />
                    <Input type="number" step="1" {...register(`partCosts.${index}.quantity`, { valueAsNumber: true })} placeholder="Qty" className="w-full sm:w-20" aria-label={`Part quantity ${index + 1}`} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label={`Remove part ${index + 1}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => append({ partName: '', cost: 0, quantity: 1 })} className="text-sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Part/Service
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1">
                <Label htmlFor="laborEstimate">Labor Estimate ($)</Label>
                <Input id="laborEstimate" type="number" step="0.01" {...register('laborEstimate', { valueAsNumber: true })} placeholder="e.g., 150.00" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="taxRate">Tax Rate (e.g., 0.08 for 8%)</Label>
                <Input id="taxRate" type="number" step="0.001" {...register('taxRate', { valueAsNumber: true })} placeholder="e.g., 0.08" />
              </div>
            </div>
          </fieldset>
        </CardContent>
        <CardFooter className="pt-6">
          <Button type="submit" disabled={isGenerating} className="w-full sm:w-auto">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Generate Invoice
          </Button>
        </CardFooter>
      </form>

      {generatedInvoice && (
        <div className="mt-8">
          <InvoicePreview 
            invoiceText={generatedInvoice.text} 
            totalAmount={generatedInvoice.total}
            customerName={generatedInvoice.customerName}
            invoiceDate={generatedInvoice.date}
          />
        </div>
      )}
    </Card>
  );
}
