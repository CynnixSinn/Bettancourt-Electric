"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InvoicePreviewProps {
  invoiceText: string;
  totalAmount: number;
  customerName?: string;
  invoiceDate?: Date;
}

export default function InvoicePreview({ invoiceText, totalAmount, customerName, invoiceDate }: InvoicePreviewProps) {
  const currentDate = invoiceDate ? new Date(invoiceDate).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="bg-muted/50 p-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-headline text-primary">Invoice</CardTitle>
          <div className="text-right">
            <p className="font-semibold">{customerName || 'Valued Customer'}</p>
            <p className="text-sm text-muted-foreground">Date: {currentDate}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-[400px] w-full border rounded-md p-4 bg-background">
          <pre className="whitespace-pre-wrap text-sm font-code leading-relaxed">
            {invoiceText || "Invoice details will appear here."}
          </pre>
        </ScrollArea>
      </CardContent>
      <Separator />
      <CardFooter className="p-6 bg-muted/50">
        <div className="w-full flex justify-end items-center">
          <span className="text-lg font-semibold mr-2 text-muted-foreground">Total Amount Due:</span>
          <span className="text-2xl font-bold text-primary">
            ${totalAmount > 0 ? totalAmount.toFixed(2) : '0.00'}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
