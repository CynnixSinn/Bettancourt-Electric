"use client";

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { CalendarIcon, Mic, UploadCloud, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { WorkOrder, CustomerInfo, Urgency, PartCost } from '@/lib/types';
import { voiceToTextWorkOrder, type VoiceToTextWorkOrderInput } from '@/ai/flows/voice-to-text-work-order';
import { analyzeWorkOrder, type AnalyzeWorkOrderInput } from '@/ai/flows/ai-job-analysis';

const workOrderSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email address'),
  customerPhone: z.string().min(1, 'Customer phone is required'),
  customerAddress: z.string().min(1, 'Customer address is required'),
  jobDescription: z.string().min(1, 'Job description is required'),
  urgency: z.enum(['Low', 'Medium', 'High']),
  location: z.string().min(1, 'Location is required'),
  deadline: z.date().optional(),
  audioFile: z.instanceof(File).optional(),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

interface WorkOrderFormProps {
  onWorkOrderCreated: (workOrder: WorkOrder) => void;
  selectedWorkOrder?: WorkOrder | null;
  onWorkOrderUpdated?: (workOrder: WorkOrder) => void;
}

export default function WorkOrderForm({ onWorkOrderCreated, selectedWorkOrder, onWorkOrderUpdated }: WorkOrderFormProps) {
  const { toast } = useToast();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentWorkOrderId, setCurrentWorkOrderId] = useState<string | null>(null);

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors }, getValues } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      urgency: 'Medium',
    },
  });

  const audioFile = watch('audioFile');

  useEffect(() => {
    if (selectedWorkOrder) {
      reset({
        customerName: selectedWorkOrder.customerDetails.name,
        customerEmail: selectedWorkOrder.customerDetails.email,
        customerPhone: selectedWorkOrder.customerDetails.phone,
        customerAddress: selectedWorkOrder.customerDetails.address,
        jobDescription: selectedWorkOrder.jobDescription,
        urgency: selectedWorkOrder.urgency,
        location: selectedWorkOrder.location,
        deadline: selectedWorkOrder.deadline,
      });
      setCurrentWorkOrderId(selectedWorkOrder.id);
    } else {
      reset({
        customerName: '', customerEmail: '', customerPhone: '', customerAddress: '',
        jobDescription: '', urgency: 'Medium', location: '', deadline: undefined, audioFile: undefined
      });
      setCurrentWorkOrderId(null);
    }
  }, [selectedWorkOrder, reset]);

  const handleAudioFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setValue('audioFile', file);
      setIsTranscribing(true);
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const audioDataUri = reader.result as string;
          const input: VoiceToTextWorkOrderInput = { audioDataUri };
          const result = await voiceToTextWorkOrder(input);
          
          setValue('jobDescription', result.jobDescription || getValues('jobDescription'));
          setValue('location', result.location || getValues('location'));
          
          if (result.urgency && ['Low', 'Medium', 'High'].includes(result.urgency)) {
             setValue('urgency', result.urgency as Urgency);
          }
          
          if (result.customerDetails) {
            setValue('jobDescription', `${getValues('jobDescription')}\n\nCustomer Notes (from voice): ${result.customerDetails}`);
          }

          toast({ title: 'Voice Transcription Successful', description: 'Form fields populated from audio.' });
          setIsTranscribing(false);
        };
        reader.onerror = (error) => {
          console.error('Error reading audio file:', error);
          toast({ title: 'Error Reading File', description: 'Could not process the audio file.', variant: 'destructive' });
          setIsTranscribing(false);
        }
      } catch (error) {
        console.error('Error transcribing audio:', error);
        toast({ title: 'Transcription Failed', description: 'Could not transcribe audio.', variant: 'destructive' });
        setIsTranscribing(false);
      }
    }
  };
  
  const onSubmit = (data: WorkOrderFormData) => {
    const customerDetails: CustomerInfo = {
      name: data.customerName,
      email: data.customerEmail,
      phone: data.customerPhone,
      address: data.customerAddress,
    };

    const workOrder: WorkOrder = {
      id: selectedWorkOrder?.id || crypto.randomUUID(),
      customerDetails,
      jobDescription: data.jobDescription,
      urgency: data.urgency as Urgency,
      location: data.location,
      status: selectedWorkOrder?.status || 'New',
      createdAt: selectedWorkOrder?.createdAt || new Date(),
      deadline: data.deadline,
      analyzedPartList: selectedWorkOrder?.analyzedPartList,
      analyzedJobDuration: selectedWorkOrder?.analyzedJobDuration,
      analyzedToolsNeeded: selectedWorkOrder?.analyzedToolsNeeded,
      analyzedManHours: selectedWorkOrder?.analyzedManHours,
    };
    
    if (selectedWorkOrder && onWorkOrderUpdated) {
      onWorkOrderUpdated(workOrder);
      toast({ title: 'Work Order Updated', description: `Job ID: ${workOrder.id}` });
    } else {
      onWorkOrderCreated(workOrder);
      setCurrentWorkOrderId(workOrder.id); 
      toast({ title: 'Work Order Created', description: `Job ID: ${workOrder.id}` });
    }
    if (!selectedWorkOrder) {
       reset(); 
    }
  };

  const handleAnalyzeJob = async () => {
    if (!currentWorkOrderId && !selectedWorkOrder) {
      toast({ title: 'No Work Order Selected', description: 'Please create or select a work order to analyze.', variant: 'destructive' });
      return;
    }

    const currentFormData = getValues();
    const targetWorkOrderData = selectedWorkOrder || {
      id: currentWorkOrderId!,
      customerDetails: { 
        name: currentFormData.customerName, 
        email: currentFormData.customerEmail, 
        phone: currentFormData.customerPhone, 
        address: currentFormData.customerAddress 
      },
      jobDescription: currentFormData.jobDescription,
      urgency: currentFormData.urgency as Urgency,
      location: currentFormData.location,
      createdAt: new Date(), // Default if new
      status: 'New', // Default if new
    };
    
    setIsAnalyzing(true);
    try {
      const analysisInput: AnalyzeWorkOrderInput = {
        jobDescription: targetWorkOrderData.jobDescription,
        customerDetails: `${targetWorkOrderData.customerDetails.name}, ${targetWorkOrderData.customerDetails.address}`,
        urgency: targetWorkOrderData.urgency,
        location: targetWorkOrderData.location,
      };
      const analysisResult = await analyzeWorkOrder(analysisInput);

      if (onWorkOrderUpdated && (selectedWorkOrder || currentWorkOrderId)) {
         const updatedWorkOrder : WorkOrder = {
            ...targetWorkOrderData, 
            id: selectedWorkOrder?.id || currentWorkOrderId!,
            analyzedPartList: analysisResult.partList,
            analyzedJobDuration: analysisResult.jobDurationEstimate,
            analyzedToolsNeeded: analysisResult.toolsNeeded,
            analyzedManHours: analysisResult.manHoursNeeded,
            status: 'Analyzed'
         };
         onWorkOrderUpdated(updatedWorkOrder);
         // If we are editing an existing order, update the form to show analysis results.
         if (selectedWorkOrder) {
           setValue('jobDescription', updatedWorkOrder.jobDescription); // In case AI modified it
         }
      }

      toast({ 
        title: 'Job Analysis Successful', 
        description: (
          <div className="text-sm">
            <p><strong>Parts:</strong> {analysisResult.partList}</p>
            <p><strong>Est. Duration:</strong> {analysisResult.jobDurationEstimate}</p>
            <p><strong>Tools:</strong> {analysisResult.toolsNeeded}</p>
            <p><strong>Man Hours:</strong> {analysisResult.manHoursNeeded}</p>
          </div>
        ),
        duration: 9000,
      });
    } catch (error) {
      console.error('Error analyzing job:', error);
      toast({ title: 'Job Analysis Failed', description: 'Could not analyze job details.', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{selectedWorkOrder ? 'Edit Work Order' : 'Create New Work Order'}</CardTitle>
        <CardDescription>Fill in the details below or use voice input for transcription.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input id="customerName" {...register('customerName')} placeholder="John Doe" />
              {errors.customerName && <p className="text-sm text-destructive">{errors.customerName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Customer Email</Label>
              <Input id="customerEmail" type="email" {...register('customerEmail')} placeholder="john.doe@example.com" />
              {errors.customerEmail && <p className="text-sm text-destructive">{errors.customerEmail.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Customer Phone</Label>
              <Input id="customerPhone" type="tel" {...register('customerPhone')} placeholder="123-456-7890" />
              {errors.customerPhone && <p className="text-sm text-destructive">{errors.customerPhone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerAddress">Customer Address</Label>
              <Input id="customerAddress" {...register('customerAddress')} placeholder="123 Main St, Anytown, USA" />
              {errors.customerAddress && <p className="text-sm text-destructive">{errors.customerAddress.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description</Label>
            <Textarea id="jobDescription" {...register('jobDescription')} placeholder="Describe the issue or service required..." rows={4} />
            {errors.jobDescription && <p className="text-sm text-destructive">{errors.jobDescription.message}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Controller
                name="urgency"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <SelectTrigger id="urgency">
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.urgency && <p className="text-sm text-destructive">{errors.urgency.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register('location')} placeholder="Job site address or area" />
              {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (Optional)</Label>
              <Controller
                name="deadline"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audioFile" className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Voice Input (Optional)
            </Label>
            <div className="flex items-center gap-2">
              <Input id="audioFile" type="file" accept="audio/*" onChange={handleAudioFileChange} className="flex-grow" disabled={isTranscribing || isAnalyzing} />
              {isTranscribing && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            </div>
            {audioFile && <p className="text-sm text-muted-foreground">Selected: {audioFile.name}</p>}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Upload an audio file of the work order request for automatic transcription.
            </p>
          </div>

           {selectedWorkOrder?.analyzedPartList && (
            <Card className="bg-secondary/50">
              <CardHeader><CardTitle className="text-lg">Job Analysis Results</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><strong>Parts Needed:</strong> {selectedWorkOrder.analyzedPartList}</p>
                <p><strong>Est. Duration:</strong> {selectedWorkOrder.analyzedJobDuration}</p>
                <p><strong>Tools Needed:</strong> {selectedWorkOrder.analyzedToolsNeeded}</p>
                <p><strong>Man Hours:</strong> {selectedWorkOrder.analyzedManHours}</p>
              </CardContent>
            </Card>
           )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
          {(currentWorkOrderId || selectedWorkOrder) && (
             <Button type="button" variant="outline" onClick={handleAnalyzeJob} disabled={isAnalyzing || isTranscribing || !getValues('jobDescription')}>
              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Analyze Job
            </Button>
          )}
          <Button type="submit" disabled={isTranscribing || isAnalyzing}>
            {isTranscribing || isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {selectedWorkOrder ? 'Update Work Order' : 'Create Work Order'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
