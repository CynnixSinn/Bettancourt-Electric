'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="bg-destructive text-destructive-foreground text-center">
          <div className="mx-auto bg-destructive-foreground/20 rounded-full p-3 w-fit">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="mt-4 text-2xl">Application Error</CardTitle>
          <CardDescription className="text-destructive-foreground/80">
            Something went wrong.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-6">
            We apologize for the inconvenience. Please try refreshing the page or contact support if the problem persists.
          </p>
          {error?.message && (
            <div className="bg-muted/50 p-3 rounded-md text-left text-sm mb-6">
              <p className="font-semibold">Error Details:</p>
              <p className="text-muted-foreground break-all">{error.message}</p>
              {error?.digest && <p className="text-xs text-muted-foreground/70 mt-1">Digest: {error.digest}</p>}
            </div>
          )}
          <Button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
            className="w-full"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
