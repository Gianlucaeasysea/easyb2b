import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, MailX } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch { setStatus("invalid"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) { setStatus("success"); }
      else if (data?.reason === "already_unsubscribed") { setStatus("already"); }
      else { setStatus("error"); }
    } catch { setStatus("error"); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Verifying...</p>
            </>
          )}
          {status === "valid" && (
            <>
              <MailX className="h-10 w-10 mx-auto text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Unsubscribe from emails</h2>
              <p className="text-muted-foreground text-sm">
                Click the button below to stop receiving emails from Easysea.
              </p>
              <Button onClick={handleUnsubscribe} disabled={processing} className="mt-2">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Unsubscribe
              </Button>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-10 w-10 mx-auto text-green-500" />
              <h2 className="text-xl font-semibold text-foreground">Unsubscribed</h2>
              <p className="text-muted-foreground text-sm">You have been successfully unsubscribed.</p>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle className="h-10 w-10 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">Already unsubscribed</h2>
              <p className="text-muted-foreground text-sm">This email is already unsubscribed.</p>
            </>
          )}
          {status === "invalid" && (
            <>
              <XCircle className="h-10 w-10 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold text-foreground">Invalid link</h2>
              <p className="text-muted-foreground text-sm">This unsubscribe link is invalid or expired.</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-10 w-10 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
              <p className="text-muted-foreground text-sm">Please try again later.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
